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

export class TopicNotFoundError extends DomainError {
  constructor(message = 'Sujet introuvable') {
    super(message);
  }
}

export class CharacterNotFoundError extends DomainError {
  constructor(message = 'Personnage introuvable') {
    super(message);
  }
}

export class SectionNotFoundError extends DomainError {
  constructor(message = 'Section introuvable') {
    super(message);
  }
}

export class CategoryNotFoundError extends DomainError {
  constructor(message = 'Catégorie introuvable') {
    super(message);
  }
}

export class MessageNotFoundError extends DomainError {
  constructor(message = 'Message introuvable') {
    super(message);
  }
}

export class PostNotFoundError extends DomainError {
  constructor(message = 'Message introuvable') {
    super(message);
  }
}

export class NoteNotFoundError extends DomainError {
  constructor(message = 'Note introuvable') {
    super(message);
  }
}

export class CarteNotFoundError extends DomainError {
  constructor(message = 'Carte introuvable') {
    super(message);
  }
}

export class AbsenceNotFoundError extends DomainError {
  constructor(message = 'Absence introuvable') {
    super(message);
  }
}

export class ThemeNotFoundError extends DomainError {
  constructor(message = 'Thème introuvable') {
    super(message);
  }
}

export class TopicClosedError extends DomainError {
  constructor(message = 'Ce sujet est fermé') {
    super(message);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Action non autorisée') {
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
