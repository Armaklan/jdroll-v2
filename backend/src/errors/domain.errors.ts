export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class UserAlreadyExistsError extends DomainError {
  constructor(message = 'Cet identifiant ou email est déjà utilisé') {
    super(message);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor(message = 'Identifiant ou mot de passe incorrect') {
    super(message);
  }
}

export class UserNotFoundError extends DomainError {
  constructor(message = 'Utilisateur introuvable') {
    super(message);
  }
}

export class CampaignNotFoundError extends DomainError {
  constructor(message = 'Campagne introuvable') {
    super(message);
  }
}

export class ValidationError extends DomainError {
  public details?: unknown;

  constructor(message = 'Données invalides', details?: unknown) {
    super(message);
    this.details = details;
  }
}
