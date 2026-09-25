export type VerifiedPrincipal = {
  provider: string;
  subject: string;
  email: string;
  displayName?: string;
};

export interface AccessTokenVerifier {
  verify(token: string): Promise<VerifiedPrincipal | null>;
}
