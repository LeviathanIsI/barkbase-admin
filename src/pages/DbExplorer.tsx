import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Loader2,
  Database,
  Table,
  Play,
  Save,
  Trash2,
  Download,
  ChevronRight,
  ChevronDown,
  AlertTriangle,
  Shield,
  Clock,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDbTables, useDbSchema, useDbQuery, useSavedQueries, useSaveQuery, useDeleteSavedQuery } from '@/hooks/useApi';
import { SlideOutPanel } from '@/components/ui/SlideOutPanel';

interface TableSchema {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  constraint_type?: string;
}

interface QueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  duration: number;
}

interface SavedQuery {
  id: string;
  name: string;
  query: string;
  createdAt: string;
}

interface WhereClause {
  column: string;
  operator: string;
  value: string;
}

const OPERATORS = ['=', '!=', '>', '<', '>=', '<=', 'LIKE', 'ILIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

export function DbExplorer() {
  const { user } = useAuth();
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [whereClauses, setWhereClauses] = useState<WhereClause[]>([]);
  const [orderBy, setOrderBy] = useState('');
  const [orderDir, setOrderDir] = useState<'ASC' | 'DESC'>('ASC');
  const [limit, setLimit] = useState(100);
  const [generatedSql, setGeneratedSql] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [showSavePanel, setShowSavePanel] = useState(false);
  const [queryName, setQueryName] = useState('');
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({});

  const { data: tablesData, isLoading: isLoadingTables } = useDbTables();
  const { data: schemaData } = useDbSchema(selectedTable || '');
  const executeQuery = useDbQuery();
  const { data: savedQueriesData } = useSavedQueries();
  const saveQuery = useSaveQuery();
  const deleteSavedQuery = useDeleteSavedQuery();

  const tables: string[] = tablesData?.tables || [];
  const schema: TableSchema[] = schemaData?.schema || [];
  const savedQueries: SavedQuery[] = savedQueriesData?.queries || [];

  // Check if user is super_admin
  const isSuperAdmin = user?.role === 'super_admin';

  // Generate SQL when selections change
  useEffect(() => {
    if (!selectedTable) {
      setGeneratedSql('');
      return;
    }

    const cols = selectedColumns.length > 0 ? selectedColumns.join(', ') : '*';
    let sql = `SELECT ${cols}\nFROM ${selectedTable}`;

    if (whereClauses.length > 0) {
      const whereStr = whereClauses
        .filter(w => w.column && w.operator)
        .map(w => {
          if (w.operator === 'IS NULL' || w.operator === 'IS NOT NULL') {
            return `${w.column} ${w.operator}`;
          }
          if (w.operator === 'IN') {
            return `${w.column} IN (${w.value})`;
          }
          if (w.operator === 'LIKE' || w.operator === 'ILIKE') {
            return `${w.column} ${w.operator} '${w.value}'`;
          }
          return `${w.column} ${w.operator} '${w.value}'`;
        })
        .join('\n  AND ');
      if (whereStr) {
        sql += `\nWHERE ${whereStr}`;
      }
    }

    if (orderBy) {
      sql += `\nORDER BY ${orderBy} ${orderDir}`;
    }

    sql += `\nLIMIT ${limit}`;

    setGeneratedSql(sql);
  }, [selectedTable, selectedColumns, whereClauses, orderBy, orderDir, limit]);

  const handleExecute = async () => {
    if (!generatedSql.trim()) return;

    setIsExecuting(true);
    setError(null);
    setResult(null);

    try {
      const res = await executeQuery.mutateAsync(generatedSql);
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleSaveQuery = async () => {
    if (!queryName.trim() || !generatedSql.trim()) return;
    await saveQuery.mutateAsync({ name: queryName, query: generatedSql });
    setShowSavePanel(false);
    setQueryName('');
  };

  const handleLoadQuery = (query: SavedQuery) => {
    setGeneratedSql(query.query);
    // Parse the query to set table, columns, etc. (simplified - just sets the SQL)
  };

  const handleDeleteQuery = async (queryId: string) => {
    if (confirm('Delete this saved query?')) {
      await deleteSavedQuery.mutateAsync(queryId);
    }
  };

  const addWhereClause = () => {
    setWhereClauses([...whereClauses, { column: '', operator: '=', value: '' }]);
  };

  const updateWhereClause = (index: number, field: keyof WhereClause, value: string) => {
    const updated = [...whereClauses];
    updated[index] = { ...updated[index], [field]: value };
    setWhereClauses(updated);
  };

  const removeWhereClause = (index: number) => {
    setWhereClauses(whereClauses.filter((_, i) => i !== index));
  };

  const toggleColumn = (column: string) => {
    setSelectedColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    );
  };

  const exportToCsv = () => {
    if (!result || result.rows.length === 0) return;

    const headers = Object.keys(result.rows[0]);
    const csvContent = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(h => {
          const val = row[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return String(val);
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedTable || 'query'}_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Access denied for non-super_admins
  if (!isSuperAdmin) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height)-96px)]">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-error-soft)] mb-4">
            <Shield className="w-8 h-8 text-[var(--color-error)]" />
          </div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Access Denied</h2>
          <p className="text-sm text-[var(--text-muted)] max-w-md">
            The Database Explorer is restricted to Super Admins only.
            Contact your administrator if you need access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-48px)]">
      {/* Left Sidebar - Tables */}
      <div className="w-64 flex-shrink-0 border-r border-[var(--border-primary)] overflow-y-auto">
        <div className="p-3">
          <div className="flex items-center gap-2 mb-3">
            <Database size={16} className="text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Tables</span>
          </div>

          {isLoadingTables ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--color-brand)]" />
            </div>
          ) : (
            <div className="space-y-1">
              {tables.map(table => (
                <button
                  key={table}
                  onClick={() => {
                    setSelectedTable(table);
                    setSelectedColumns([]);
                    setWhereClauses([]);
                    setOrderBy('');
                    setResult(null);
                    setExpandedTables(prev => ({ ...prev, [table]: !prev[table] }));
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-1 ${
                    selectedTable === table
                      ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]'
                      : 'text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                  }`}
                >
                  {expandedTables[table] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Table size={14} />
                  <span className="truncate">{table}</span>
                </button>
              ))}
            </div>
          )}

          {/* Saved Queries */}
          {savedQueries.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Save size={14} className="text-[var(--text-muted)]" />
                <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Saved Queries</span>
              </div>
              <div className="space-y-1">
                {savedQueries.map(query => (
                  <div
                    key={query.id}
                    className="flex items-center justify-between group px-2 py-1.5 rounded hover:bg-[var(--hover-overlay)]"
                  >
                    <button
                      onClick={() => handleLoadQuery(query)}
                      className="text-sm text-[var(--text-secondary)] truncate text-left flex-1"
                    >
                      {query.name}
                    </button>
                    <button
                      onClick={() => handleDeleteQuery(query.id)}
                      className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Warning Banner */}
        <div className="px-4 py-2 bg-[var(--color-warning-soft)] border-b border-[var(--color-warning)]/20">
          <div className="flex items-center gap-2 text-sm text-[var(--color-warning)]">
            <AlertTriangle size={16} />
            <span className="font-medium">Read-only access</span>
            <span className="text-[var(--color-warning)]/80">• SELECT queries only • 10s timeout • Rate limited</span>
          </div>
        </div>

        {/* Query Builder */}
        <div className="p-4 border-b border-[var(--border-primary)] space-y-4">
          {selectedTable && schema.length > 0 && (
            <>
              {/* Schema Info */}
              <div>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-2">
                  Columns ({schema.length})
                </label>
                <div className="flex flex-wrap gap-1">
                  {schema.map(col => (
                    <button
                      key={col.column_name}
                      onClick={() => toggleColumn(col.column_name)}
                      className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                        selectedColumns.includes(col.column_name)
                          ? 'bg-[var(--color-brand)] text-white'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]'
                      }`}
                      title={`${col.data_type}${col.constraint_type ? ` (${col.constraint_type})` : ''}`}
                    >
                      {col.column_name}
                    </button>
                  ))}
                </div>
              </div>

              {/* WHERE Clauses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">WHERE</label>
                  <button
                    onClick={addWhereClause}
                    className="text-xs text-[var(--color-brand)] hover:underline"
                  >
                    + Add condition
                  </button>
                </div>
                {whereClauses.length > 0 && (
                  <div className="space-y-2">
                    {whereClauses.map((clause, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {idx > 0 && <span className="text-xs text-[var(--text-muted)]">AND</span>}
                        <select
                          value={clause.column}
                          onChange={(e) => updateWhereClause(idx, 'column', e.target.value)}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                        >
                          <option value="">Column...</option>
                          {schema.map(col => (
                            <option key={col.column_name} value={col.column_name}>
                              {col.column_name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={clause.operator}
                          onChange={(e) => updateWhereClause(idx, 'operator', e.target.value)}
                          className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                        >
                          {OPERATORS.map(op => (
                            <option key={op} value={op}>{op}</option>
                          ))}
                        </select>
                        {clause.operator !== 'IS NULL' && clause.operator !== 'IS NOT NULL' && (
                          <input
                            type="text"
                            value={clause.value}
                            onChange={(e) => updateWhereClause(idx, 'value', e.target.value)}
                            placeholder="Value..."
                            className="flex-1 px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                          />
                        )}
                        <button
                          onClick={() => removeWhereClause(idx)}
                          className="p-1 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ORDER BY & LIMIT */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">ORDER BY</label>
                  <select
                    value={orderBy}
                    onChange={(e) => setOrderBy(e.target.value)}
                    className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                  >
                    <option value="">None</option>
                    {schema.map(col => (
                      <option key={col.column_name} value={col.column_name}>
                        {col.column_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={orderDir}
                    onChange={(e) => setOrderDir(e.target.value as 'ASC' | 'DESC')}
                    className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                  >
                    <option value="ASC">ASC</option>
                    <option value="DESC">DESC</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-[var(--text-muted)]">LIMIT</label>
                  <select
                    value={limit}
                    onChange={(e) => setLimit(Number(e.target.value))}
                    className="px-2 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded text-xs"
                  >
                    {[10, 25, 50, 100, 250, 500].map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {/* SQL Preview */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-[var(--text-muted)]">Generated SQL</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSavePanel(true)}
                  disabled={!generatedSql.trim()}
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-50"
                >
                  <Save size={14} />
                </button>
              </div>
            </div>
            <pre className="p-3 bg-[var(--bg-tertiary)] rounded-md text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap min-h-[80px]">
              {generatedSql || 'Select a table to build a query...'}
            </pre>
          </div>

          {/* Execute Button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleExecute}
              disabled={isExecuting || !generatedSql.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {isExecuting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
              Execute
            </button>
            {result && (
              <button
                onClick={exportToCsv}
                className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
              >
                <Download size={14} />
                Export CSV
              </button>
            )}
          </div>

          {error && (
            <div className="p-3 bg-[var(--color-error-soft)] rounded-md text-sm text-[var(--color-error)]">
              {error}
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {result ? (
            <div>
              {/* Result Stats */}
              <div className="px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <span>{result.rowCount} rows returned</span>
                <span className="flex items-center gap-1">
                  <Clock size={12} />
                  {result.duration}ms
                </span>
              </div>

              {/* Results Table */}
              {result.rows.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-[var(--bg-secondary)]">
                      <tr className="text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">
                        {Object.keys(result.rows[0]).map(col => (
                          <th key={col} className="px-4 py-2 border-b border-[var(--border-primary)]">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border-primary)]">
                      {result.rows.map((row, idx) => (
                        <tr
                          key={idx}
                          onClick={() => setSelectedRow(row)}
                          className="hover:bg-[var(--hover-overlay)] cursor-pointer"
                        >
                          {Object.values(row).map((val, i) => (
                            <td key={i} className="px-4 py-2 text-xs text-[var(--text-secondary)] font-mono max-w-xs truncate">
                              {val === null ? (
                                <span className="text-[var(--text-muted)] italic">null</span>
                              ) : typeof val === 'object' ? (
                                JSON.stringify(val)
                              ) : (
                                String(val)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">
                  No rows returned
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--text-muted)]">
              <div className="text-center">
                <Database size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Build and execute a query to see results</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row Detail Panel */}
      <SlideOutPanel
        isOpen={!!selectedRow}
        onClose={() => setSelectedRow(null)}
        title="Row Details"
        width="md"
      >
        {selectedRow && (
          <div className="space-y-3">
            {Object.entries(selectedRow).map(([key, value]) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
                  {key}
                </label>
                <div className="p-2 bg-[var(--bg-tertiary)] rounded text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all">
                  {value === null ? (
                    <span className="text-[var(--text-muted)] italic">null</span>
                  ) : typeof value === 'object' ? (
                    JSON.stringify(value, null, 2)
                  ) : (
                    String(value)
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SlideOutPanel>

      {/* Save Query Panel */}
      <SlideOutPanel
        isOpen={showSavePanel}
        onClose={() => setShowSavePanel(false)}
        title="Save Query"
        width="sm"
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowSavePanel(false)}
              className="px-4 py-2 rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--hover-overlay)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveQuery}
              disabled={!queryName.trim() || saveQuery.isPending}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {saveQuery.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </button>
          </div>
        }
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Query Name
          </label>
          <input
            type="text"
            value={queryName}
            onChange={(e) => setQueryName(e.target.value)}
            placeholder="e.g., Active Enterprise Tenants"
            className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
          />
        </div>
      </SlideOutPanel>
    </div>
  );
}
