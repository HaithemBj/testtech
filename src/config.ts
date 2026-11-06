import 'dotenv/config';

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Variable d'environnement manquante: ${name} (voir .env.example)`);
  return v;
}

// Les valeurs sensibles ne sont jamais écrites dans le code : tout vient de l'environnement.
export const config = {
  dacrc: {
    url: () => required('URL_DACRC').replace(/\/$/, ''),
    user: () => required('USER_DACRC'),
    password: () => required('PASSWORD_DACRC'),
  },
  dactech: {
    url: () => required('URL_DACTECH'),
    user: () => required('USER_DACTECH'),
    password: () => required('PASSWORD_DACTECH'),
  },
  data: {
    typeDemande: () => required('TYPE_DEMANDE'),
    demandeur: () => required('DEMANDEUR'),
    dkCode: () => required('DKCODE'),
    service: () => process.env.SERVICE || 'Chauffage',
    motif: () => required('MOTIF'),
    raisonMajUrgence: () => process.env.RAISON_MAJ_URGENCE || 'TNR',
    proprietaire: () => process.env.PROPRIETAIRE || 'Robot RPA',
    matricule: () => required('INTERVENANT_MATRICULE'),
  },
};
