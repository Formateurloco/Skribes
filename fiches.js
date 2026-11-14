export const characters = {
  Glyphomancien: {
    card: '98', description: 'Spécialiste de l’écriture', runes: ['G', 'G', 'P', 'B', 'D', 'G'],
    power: 'Il peut annuler un lancer de runes (le sien ou celui d’un allié) et relancer.',
    pigment: '1 pigment turquoise. Il peut écrire un G sur une rune vide.',
  },
  Dévoreur: {
    card: '94', description: 'Spécialiste de la lecture', runes: ['G', 'P', 'D', 'B', 'D', 'D'],
    power: 'Il sacrifie une de ses runes D. Elle devient inutilisable pour le reste de l’Archive. Ajoutez immédiatement 2 points au pot d’encre.',
    pigment: '1 pigment rouge. Il peut écrire un D sur une rune vide.',
  },
  Copiste: {
    card: '97', description: 'Spécialiste du vide', runes: ['G', 'P', 'D', null, 'B', 'G'],
    power: 'Deux joueurs (dont le Copiste) fusionnent deux runes vides pour créer une rune de son choix. Mettez les runes l’une sur l’autre.',
    pigment: '2 pigments de couleurs différentes. Il peut écrire la rune de son choix sur une rune vide.',
  },
  Pliombre: {
    card: '93', description: 'Spécialiste du pli', runes: ['G', 'D', 'P', 'B', 'P', 'P'],
    power: 'Il annule un échec infligé au groupe ou au joueur.',
    pigment: '1 pigment violet. Il peut écrire un P sur une rune vide.',
  },
};

export const chargeColors = ['#8fc6c1', '#b6a7e4', '#f2a89a'];
