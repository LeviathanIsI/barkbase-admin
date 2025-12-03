import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Loader2,
  Play,
  Clock,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Check,
  BookOpen,
  History,
  AlertTriangle,
} from 'lucide-react';
import { useSearch, useApiProxy } from '@/hooks/useApi';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestHistoryItem {
  id: string;
  method: HttpMethod;
  path: string;
  tenantId: string;
  tenantName: string;
  timestamp: string;
  status: number;
  duration: number;
  body?: string;
}

interface ApiResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: unknown;
  duration: number;
}

const ENDPOINT_LIBRARY = {
  'Tenants': [
    { method: 'GET', path: '/tenants', description: 'List all tenants' },
    { method: 'GET', path: '/tenants/:id', description: 'Get tenant by ID' },
    { method: 'GET', path: '/tenants/:id/users', description: 'Get tenant users' },
    { method: 'GET', path: '/tenants/:id/settings', description: 'Get tenant settings' },
  ],
  'Users': [
    { method: 'GET', path: '/users', description: 'List users' },
    { method: 'GET', path: '/users/:id', description: 'Get user by ID' },
    { method: 'GET', path: '/users/me', description: 'Get current user' },
  ],
  'Bookings': [
    { method: 'GET', path: '/bookings', description: 'List bookings' },
    { method: 'GET', path: '/bookings/:id', description: 'Get booking by ID' },
    { method: 'POST', path: '/bookings', description: 'Create booking' },
    { method: 'PUT', path: '/bookings/:id', description: 'Update booking' },
    { method: 'DELETE', path: '/bookings/:id', description: 'Cancel booking' },
  ],
  'Pets': [
    { method: 'GET', path: '/pets', description: 'List pets' },
    { method: 'GET', path: '/pets/:id', description: 'Get pet by ID' },
    { method: 'POST', path: '/pets', description: 'Create pet' },
    { method: 'PUT', path: '/pets/:id', description: 'Update pet' },
  ],
  'Services': [
    { method: 'GET', path: '/services', description: 'List services' },
    { method: 'GET', path: '/services/:id', description: 'Get service by ID' },
    { method: 'POST', path: '/services', description: 'Create service' },
  ],
  'Payments': [
    { method: 'GET', path: '/payments', description: 'List payments' },
    { method: 'GET', path: '/payments/:id', description: 'Get payment by ID' },
    { method: 'GET', path: '/invoices', description: 'List invoices' },
  ],
};

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: 'bg-[var(--color-success)] text-white',
  POST: 'bg-[var(--color-info)] text-white',
  PUT: 'bg-[var(--color-warning)] text-black',
  PATCH: 'bg-[var(--color-warning)] text-black',
  DELETE: 'bg-[var(--color-error)] text-white',
};

const STATUS_COLORS = {
  success: 'text-[var(--color-success)]',
  redirect: 'text-[var(--color-warning)]',
  clientError: 'text-[var(--color-error)]',
  serverError: 'text-[var(--color-error)]',
};

function getStatusColor(status: number): string {
  if (status >= 200 && status < 300) return STATUS_COLORS.success;
  if (status >= 300 && status < 400) return STATUS_COLORS.redirect;
  if (status >= 400 && status < 500) return STATUS_COLORS.clientError;
  return STATUS_COLORS.serverError;
}

function JsonSyntaxHighlight({ json }: { json: string }) {
  const highlighted = json
    .replace(/(".*?")(:\s*)/g, '<span class="text-[var(--color-info)]">$1</span>$2')
    .replace(/:\s*(".*?")/g, ': <span class="text-[var(--color-success)]">$1</span>')
    .replace(/:\s*(\d+\.?\d*)/g, ': <span class="text-[var(--color-warning)]">$1</span>')
    .replace(/:\s*(true|false)/g, ': <span class="text-[var(--color-brand)]">$1</span>')
    .replace(/:\s*(null)/g, ': <span class="text-[var(--text-muted)]">$1</span>');

  return (
    <pre
      className="text-xs font-mono text-[var(--text-primary)] whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: highlighted }}
    />
  );
}

export function ApiWorkbench() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [path, setPath] = useState('/tenants');
  const [body, setBody] = useState('');
  const [bodyError, setBodyError] = useState<string | null>(null);
  const [tenantSearch, setTenantSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<{ id: string; name: string } | null>(null);
  const [showTenantDropdown, setShowTenantDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<ApiResponse | null>(null);
  const [history, setHistory] = useState<RequestHistoryItem[]>([]);
  const [showLibrary, setShowLibrary] = useState(true);
  const [showHistory, setShowHistory] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Tenants: true });
  const [showHeaders, setShowHeaders] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: searchData } = useSearch(tenantSearch);
  const apiProxy = useApiProxy();
  const tenantResults = searchData?.results?.filter(r => r.type === 'tenant') || [];

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('api-workbench-history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save history to localStorage
  useEffect(() => {
    localStorage.setItem('api-workbench-history', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  // Validate JSON body
  useEffect(() => {
    if (!body.trim() || method === 'GET' || method === 'DELETE') {
      setBodyError(null);
      return;
    }
    try {
      JSON.parse(body);
      setBodyError(null);
    } catch (e) {
      setBodyError(e instanceof Error ? e.message : 'Invalid JSON');
    }
  }, [body, method]);

  const handleExecute = async () => {
    if (!selectedTenant) return;
    if (bodyError) return;

    setIsLoading(true);
    setResponse(null);

    try {
      const result = await apiProxy.mutateAsync({
        method,
        path,
        body: body && (method === 'POST' || method === 'PUT' || method === 'PATCH') ? JSON.parse(body) : undefined,
        tenantId: selectedTenant.id,
      });

      const apiResponse: ApiResponse = {
        status: result.status,
        statusText: result.statusText,
        headers: result.headers,
        body: result.body,
        duration: result.duration,
      };

      setResponse(apiResponse);

      // Add to history
      const historyItem: RequestHistoryItem = {
        id: crypto.randomUUID(),
        method,
        path,
        tenantId: selectedTenant.id,
        tenantName: selectedTenant.name,
        timestamp: new Date().toISOString(),
        status: apiResponse.status,
        duration: result.duration,
        body: body || undefined,
      };

      setHistory(prev => [historyItem, ...prev].slice(0, 50));
    } catch (error: unknown) {
      const err = error as Error;
      setResponse({
        status: 0,
        statusText: 'Error',
        headers: {},
        body: { error: err.message || 'Failed to connect to API' },
        duration: 0,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReplayHistory = (item: RequestHistoryItem) => {
    setMethod(item.method);
    setPath(item.path);
    setBody(item.body || '');
    setSelectedTenant({ id: item.tenantId, name: item.tenantName });
    setTenantSearch(item.tenantName);
  };

  const handleCopyResponse = () => {
    if (response) {
      navigator.clipboard.writeText(JSON.stringify(response.body, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('api-workbench-history');
  };

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const selectEndpoint = (endpoint: { method: string; path: string }) => {
    setMethod(endpoint.method as HttpMethod);
    setPath(endpoint.path);
    if (endpoint.method === 'POST' || endpoint.method === 'PUT') {
      setBody('{\n  \n}');
    } else {
      setBody('');
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height)-48px)]">
      {/* Left Sidebar - Endpoint Library */}
      <div className={`${showLibrary ? 'w-64' : 'w-0'} flex-shrink-0 border-r border-[var(--border-primary)] overflow-hidden transition-all`}>
        <div className="h-full overflow-y-auto p-3">
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={16} className="text-[var(--text-muted)]" />
            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">Endpoints</span>
          </div>

          {Object.entries(ENDPOINT_LIBRARY).map(([group, endpoints]) => (
            <div key={group} className="mb-2">
              <button
                onClick={() => toggleGroup(group)}
                className="w-full flex items-center gap-1 py-1.5 text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                {expandedGroups[group] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {group}
              </button>
              {expandedGroups[group] && (
                <div className="ml-4 space-y-1">
                  {endpoints.map((endpoint, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectEndpoint(endpoint)}
                      className="w-full text-left px-2 py-1.5 rounded hover:bg-[var(--hover-overlay)] group"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${METHOD_COLORS[endpoint.method as HttpMethod]}`}>
                          {endpoint.method}
                        </span>
                        <span className="text-xs text-[var(--text-muted)] font-mono truncate group-hover:text-[var(--text-primary)]">
                          {endpoint.path}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLibrary(!showLibrary)}
              className={`p-1.5 rounded-md transition-colors ${showLibrary ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]'}`}
              title="Toggle endpoint library"
            >
              <BookOpen size={16} />
            </button>
            <h1 className="text-lg font-semibold text-[var(--text-primary)]">API Workbench</h1>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-1.5 rounded-md transition-colors ${showHistory ? 'bg-[var(--color-brand-subtle)] text-[var(--color-brand)]' : 'text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]'}`}
            title="Toggle history"
          >
            <History size={16} />
          </button>
        </div>

        {/* Request Builder */}
        <div className="p-4 border-b border-[var(--border-primary)] space-y-3">
          {/* Tenant Selector */}
          <div className="relative">
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Tenant Context</label>
            <div className="relative">
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => {
                  setTenantSearch(e.target.value);
                  setShowTenantDropdown(true);
                  if (!e.target.value) setSelectedTenant(null);
                }}
                onFocus={() => setShowTenantDropdown(true)}
                placeholder="Search for a tenant..."
                className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
              />
              {selectedTenant && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-success)]">
                  <Check size={14} />
                </span>
              )}
            </div>
            {showTenantDropdown && tenantSearch.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-md shadow-lg max-h-48 overflow-y-auto">
                {tenantResults.length > 0 ? (
                  tenantResults.map(tenant => (
                    <button
                      key={tenant.id}
                      onClick={() => {
                        setSelectedTenant({ id: tenant.id, name: tenant.name });
                        setTenantSearch(tenant.name);
                        setShowTenantDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--hover-overlay)]"
                    >
                      <span className="text-[var(--text-primary)]">{tenant.name}</span>
                      <span className="text-xs text-[var(--text-muted)] ml-2">{tenant.subdomain}</span>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-sm text-[var(--text-muted)]">No tenants found</div>
                )}
              </div>
            )}
          </div>

          {/* Method + Path */}
          <div className="flex gap-2">
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
              className={`px-3 py-2 rounded-md text-sm font-bold border-0 ${METHOD_COLORS[method]}`}
            >
              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map(m => (
                <option key={m} value={m} className="bg-[var(--bg-secondary)] text-[var(--text-primary)]">{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="/endpoint/path"
              className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-md text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-brand)]"
            />
            <button
              onClick={handleExecute}
              disabled={isLoading || !selectedTenant}
              className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand-hover)] disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play size={16} />}
              Send
            </button>
          </div>

          {/* Body Editor */}
          {(method === 'POST' || method === 'PUT' || method === 'PATCH') && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[var(--text-muted)]">Request Body (JSON)</label>
                {bodyError && (
                  <span className="flex items-center gap-1 text-xs text-[var(--color-error)]">
                    <AlertTriangle size={12} />
                    {bodyError}
                  </span>
                )}
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={6}
                placeholder='{\n  "key": "value"\n}'
                className={`w-full px-3 py-2 bg-[var(--bg-tertiary)] border rounded-md text-sm font-mono text-[var(--text-primary)] focus:outline-none resize-none ${
                  bodyError ? 'border-[var(--color-error)]' : 'border-[var(--border-primary)] focus:border-[var(--color-brand)]'
                }`}
              />
            </div>
          )}
        </div>

        {/* Response Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          {response ? (
            <div className="space-y-3">
              {/* Status Line */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`text-lg font-bold ${getStatusColor(response.status)}`}>
                    {response.status} {response.statusText}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                    <Clock size={14} />
                    {response.duration}ms
                  </span>
                </div>
                <button
                  onClick={handleCopyResponse}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:bg-[var(--hover-overlay)]"
                >
                  {copied ? <Check size={14} className="text-[var(--color-success)]" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>

              {/* Headers */}
              <div>
                <button
                  onClick={() => setShowHeaders(!showHeaders)}
                  className="flex items-center gap-1 text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                >
                  {showHeaders ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  Response Headers
                </button>
                {showHeaders && Object.keys(response.headers).length > 0 && (
                  <div className="mt-2 p-2 bg-[var(--bg-tertiary)] rounded-md">
                    {Object.entries(response.headers).map(([key, value]) => (
                      <div key={key} className="text-xs font-mono">
                        <span className="text-[var(--color-info)]">{key}</span>
                        <span className="text-[var(--text-muted)]">: </span>
                        <span className="text-[var(--text-secondary)]">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="p-3 bg-[var(--bg-tertiary)] rounded-md overflow-x-auto">
                <JsonSyntaxHighlight json={JSON.stringify(response.body, null, 2)} />
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-[var(--text-muted)]">
              <div className="text-center">
                <Play size={48} className="mx-auto mb-2 opacity-20" />
                <p className="text-sm">Select a tenant and send a request</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Sidebar - History */}
      <div className={`${showHistory ? 'w-72' : 'w-0'} flex-shrink-0 border-l border-[var(--border-primary)] overflow-hidden transition-all`}>
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-2">
              <History size={16} className="text-[var(--text-muted)]" />
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">History</span>
            </div>
            {history.length > 0 && (
              <button
                onClick={clearHistory}
                className="p-1 rounded hover:bg-[var(--color-error-soft)] text-[var(--text-muted)] hover:text-[var(--color-error)]"
                title="Clear history"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {history.length > 0 ? (
              history.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleReplayHistory(item)}
                  className="w-full text-left p-2 rounded hover:bg-[var(--hover-overlay)] group"
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-bold px-1 py-0.5 rounded ${METHOD_COLORS[item.method]}`}>
                      {item.method}
                    </span>
                    <span className="text-xs font-mono text-[var(--text-muted)] truncate flex-1 group-hover:text-[var(--text-primary)]">
                      {item.path}
                    </span>
                    <span className={`text-xs font-bold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[10px] text-[var(--text-muted)] truncate">{item.tenantName}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{format(new Date(item.timestamp), 'HH:mm:ss')}</span>
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-8 text-[var(--text-muted)]">
                <History size={24} className="mx-auto mb-2 opacity-20" />
                <p className="text-xs">No history yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
