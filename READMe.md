# 🎬 Bot Steelbook Discord

Un bot Discord automatisé qui surveille et notifie les nouveaux steelbooks disponibles sur plusieurs sites marchands (Zavvi, Amazon, Fnac, E.Leclerc, ChocoBonPlan, etc.).

## 📋 Table des matières

- [Fonctionnalités](#-fonctionnalités)
- [Prérequis](#-prérequis)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Commandes disponibles](#-commandes-disponibles)
- [Watchers](#-watchers)
- [Structure du projet](#-structure-du-projet)
- [Utilisation](#-utilisation)
- [Contribution](#-contribution)

## ✨ Fonctionnalités

### 🔍 Surveillance automatique
- **Zavvi FR** : Nouveautés et précommandes
- **Zavvi UK** : Précommandes
- **Amazon** : Nouveaux steelbooks
- **ChocoBonPlan** : Deals et promotions
- **Steelbook.com** : Sorties officielles

### 🎮 Commandes interactives
- Gestion de collection personnelle
- Recherche d'informations sur les films
- Consultation des steelbooks disponibles par pays
- Système de pagination pour navigation facile

### 🔔 Notifications
- Mentions de rôles pour les nouvelles sorties
- Messages avec images et liens directs
- Distinction précommandes/disponibilités immédiates
- Logs détaillés dans un salon dédié

## 📦 Prérequis

- [Node.js](https://nodejs.org/) v16.9.0 ou supérieur
- Un bot Discord avec les permissions nécessaires
- Clé API [The Movie Database (TMDb)](https://www.themoviedb.org/settings/api)

## 🚀 Installation

1. Clonez le repository :
```bash
git clone <repository-url>
cd Bot-Steelbook
```

2. Installez les dépendances :
```bash
npm install
```

3. Configurez le bot (voir [Configuration](#-configuration))

4. Lancez le bot :
```bash
node main.js
```

## ⚙️ Configuration

Créez/modifiez le fichier [`config.js`](config.js) :

```javascript
module.exports = {
    token: "VOTRE_TOKEN_DISCORD",
    apiKey: "VOTRE_CLE_TMDB"
}
```

### Structure des données

Le bot utilise plusieurs fichiers JSON pour stocker les données :

- [`data/caches/`](data/caches/) : Cache des steelbooks par site
  - [`cacheZavviFR.json`](data/caches/cacheZavviFR.json)
  - [`cacheChoco.json`](data/caches/cacheChoco.json)
  - etc.
- [`data/collections/collections.json`](data/collections/collections.json) : Collections des utilisateurs
- [`data/emojis.json`](data/emojis.json) : Emojis utilisés par le bot
- [`data/countries.json`](data/countries.json) : Liste des pays pour Zavvi

## 📝 Commandes disponibles

### `/ping`
Vérifie la latence du bot.

**Exemple :**
```
/ping
```

### `/collection`
Affiche la collection de steelbooks d'un membre.

**Options :**
- `membre` (requis) : L'utilisateur dont vous voulez voir la collection

**Exemple :**
```
/collection membre:@User
```

### `/addcollection`
Ajoute un steelbook à votre collection personnelle.

**Options :**
- `steelbook` (requis) : Nom du steelbook

**Exemple :**
```
/addcollection steelbook:Dune
```

### `/rmcollection`
Supprime un steelbook de votre collection selon son numéro.

**Options :**
- `numero` (requis) : Numéro du steelbook dans la liste

**Exemple :**
```
/rmcollection numero:5
```

### `/infosfilm`
Obtient des informations détaillées sur un film (synopsis, réalisateur, note, etc.).

**Options :**
- `film` (requis) : Titre du film

**Exemple :**
```
/infosfilm film:Inception
```

### `/zavvi`
Liste les steelbooks disponibles sur Zavvi selon le pays sélectionné.

**Options :**
- `pays` (requis, autocomplete) : Code pays (fr, uk, etc.)

**Exemple :**
```
/zavvi pays:fr
```

## 🔍 Watchers

Les watchers surveillent automatiquement les sites toutes les 30 minutes.

### Watchers actifs

| Site | Fichier | Fréquence |
|------|---------|-----------|
| Zavvi FR | [`zavviWatcherFR.js`](Watchers/zavviWatcherFR.js) | 30 min |
| Zavvi FR PreOrder | [`zavviWatcherFrPreOrder.js`](Watchers/zavviWatcherFrPreOrder.js) | 30 min |
| Zavvi UK PreOrder | [`zavviWatcherPreOrder.js`](Watchers/zavviWatcherPreOrder.js) | 30 min |
| Amazon | [`amazonWatcher.js`](Watchers/amazonWatcher.js) | 30 min |
| Steelbook.com | [`steelbookWatcher.js`](Watchers/steelbookWatcher.js) | 30 min |
| ChocoBonPlan | [`chocoWatcher.js`](Watchers/chocoWatcher.js) | 30 min |

### Watchers désactivés

Situés dans [`Watchers/unused/`](Watchers/unused/) :
- [`fnacWatcherPreOrder.js`](Watchers/unused/fnacWatcherPreOrder.js)
- [`leclercWatcherPreOrder.js`](Watchers/unused/leclercWatcherPreOrder.js)
- [`leclercWatcherEnStock.js`](Watchers/unused/leclercWatcherEnStock.js)
- [`escWatcherPreOrder.js`](Watchers/unused/escWatcherPreOrder.js)

## 📁 Structure du projet

```
Bot-Steelbook/
├── Commandes/              # Commandes slash du bot
│   ├── ping.js
│   ├── collection.js
│   ├── addcollection.js
│   ├── rmcollection.js
│   ├── infosfilm.js
│   └── zavvi.js
├── Events/                 # Gestionnaires d'événements Discord
│   ├── ready.js
│   └── interactionCreate.js
├── Loaders/                # Chargeurs de modules
│   ├── loadCommands.js
│   ├── loadEvents.js
│   └── loadSlashCommands.js
├── Watchers/               # Surveillants de sites web
│   ├── zavviWatcherFR.js
│   ├── amazonWatcher.js
│   ├── chocoWatcher.js
│   └── unused/             # Watchers désactivés
├── data/                   # Données du bot
│   ├── caches/             # Cache des steelbooks
│   ├── collections/        # Collections utilisateurs
│   ├── emojis.json
│   └── countries.json
├── config.js               # Configuration
├── tools.js                # Fonctions utilitaires
├── main.js                 # Point d'entrée
└── package.json
```

## 🎯 Utilisation

### Rejoindre un serveur

Le bot accepte automatiquement les invitations uniquement sur les serveurs autorisés (configurés dans [`main.js`](main.js)).

### Rôles automatiques

Lorsqu'un nouveau membre rejoint, il reçoit automatiquement le rôle par défaut.

### Notifications

Les nouveaux steelbooks sont postés dans les salons dédiés :
- **Précommandes** : Salon spécifique avec mention du rôle
- **Disponibles** : Salon des nouveautés en stock
- **Logs** : Salon de logs pour le suivi

## 🔧 Technologies utilisées

- [Discord.js](https://discord.js.org/) v14.16.3 - Bibliothèque Discord
- [Axios](https://axios-http.com/) v1.7.7 - Requêtes HTTP
- [Cheerio](https://cheerio.js.org/) v1.0.0 - Web scraping
- [Puppeteer](https://pptr.dev/) v24.12.1 - Automatisation navigateur
- [Node-cron](https://www.npmjs.com/package/node-cron) v3.0.3 - Tâches planifiées

## 📊 Dépendances

Voir [`package.json`](package.json) pour la liste complète des dépendances.

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :

1. Fork le projet
2. Créer une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Commit vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📝 Licence

Ce projet est sous licence privée. Tous droits réservés.

## 👤 Auteur

**AyXxos**

## 🙏 Remerciements

- The Movie Database (TMDb) pour l'API de films
- Tous les sites marchands surveillés
- La communauté Discord.js

---

⭐ N'oubliez pas de mettre une étoile si ce projet vous plaît !