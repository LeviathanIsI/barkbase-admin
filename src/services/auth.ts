import {
  CognitoUserPool,
  CognitoUser,
  AuthenticationDetails,
  CognitoUserSession,
} from 'amazon-cognito-identity-js';
import { cognitoConfig, isAdminRole } from '@/config/cognito';
import type { AuthUser, AdminRole } from '@/types';

const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId,
});

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
}

function parseJwt(token: string): Record<string, unknown> {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonPayload = decodeURIComponent(
    atob(base64)
      .split('')
      .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  );
  return JSON.parse(jsonPayload);
}

function extractUserFromSession(session: CognitoUserSession): AuthUser | null {
  const idToken = session.getIdToken().getJwtToken();
  const payload = parseJwt(idToken);

  const role = payload['custom:role'] as string;
  if (!role || !isAdminRole(role)) {
    return null;
  }

  return {
    id: payload['sub'] as string,
    email: payload['email'] as string,
    name: payload['name'] as string || payload['email'] as string,
    role: role as AdminRole,
  };
}

export async function login(credentials: LoginCredentials): Promise<AuthUser> {
  return new Promise((resolve, reject) => {
    const cognitoUser = new CognitoUser({
      Username: credentials.email,
      Pool: userPool,
    });

    const authDetails = new AuthenticationDetails({
      Username: credentials.email,
      Password: credentials.password,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: (session) => {
        const user = extractUserFromSession(session);
        if (!user) {
          reject(new Error('Access denied. Admin role required.'));
          return;
        }
        resolve(user);
      },
      onFailure: (err) => {
        reject(err);
      },
      newPasswordRequired: () => {
        reject(new Error('Password change required. Please contact support.'));
      },
    });
  });
}

export async function logout(): Promise<void> {
  const cognitoUser = userPool.getCurrentUser();
  if (cognitoUser) {
    cognitoUser.signOut();
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      const user = extractUserFromSession(session);
      resolve(user);
    });
  });
}

export async function getAccessToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      resolve(session.getAccessToken().getJwtToken());
    });
  });
}

export async function getIdToken(): Promise<string | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session || !session.isValid()) {
        resolve(null);
        return;
      }

      resolve(session.getIdToken().getJwtToken());
    });
  });
}

export async function refreshSession(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    const cognitoUser = userPool.getCurrentUser();
    if (!cognitoUser) {
      resolve(null);
      return;
    }

    cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
      if (err || !session) {
        resolve(null);
        return;
      }

      const refreshToken = session.getRefreshToken();
      cognitoUser.refreshSession(refreshToken, (refreshErr, newSession) => {
        if (refreshErr || !newSession) {
          resolve(null);
          return;
        }

        const user = extractUserFromSession(newSession);
        resolve(user);
      });
    });
  });
}
