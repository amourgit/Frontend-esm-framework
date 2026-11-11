# REFONTE RADICALE DU SYSTÈME DE DESIGN THEME D’EGEN

## 1. OBJECTIF GÉNÉRAL

Nous allons abandonner complètement le système de gestion des thèmes/design que nous avions commencé à développer nous-mêmes.

Il ne faut pas chercher à améliorer progressivement l’existant.

**Il doit être supprimé et remplacé proprement par une solution fondée sur TokiForge, intégrée directement dans le framework EGEN.**

L’objectif est de construire dans EGEN un véritable système de Design System capable de permettre à une organisation, un administrateur, un designer ou un utilisateur autorisé de **définir, personnaliser, importer, exporter, prévisualiser, appliquer et modifier intégralement l’apparence de l’écosystème EGEN.**

Ce système doit être pensé comme une capacité fondamentale du framework, et non comme une fonctionnalité secondaire.

---

# 2. POURQUOI NOUS CHANGEONS COMPLÈTEMENT D’APPROCHE

Le système actuellement commencé manuellement n'est pas suffisamment efficace pour atteindre l'objectif recherché.

Nous ne voulons pas simplement disposer de quelques couleurs globales, d'une police et de quelques tailles prédéfinies.

EGEN doit pouvoir gérer un véritable système de design cohérent, profond et extrêmement flexible.

L'idée est de permettre de contrôler l'apparence de l'interface **du plus petit élément jusqu'à l'ensemble de l'application.**

Par exemple :

- la couleur d'un texte ;
- la couleur d'un texte secondaire ;
- la couleur d'un arrière-plan ;
- la couleur d'une bordure ;
- l'épaisseur d'une bordure ;
- le rayon d'un composant ;
- une ombre ;
- une transparence ;
- un effet de flou ;
- une taille ;
- une hauteur ;
- une largeur ;
- un espacement ;
- une typographie ;
- une icône ;
- un état hover ;
- un état focus ;
- un état disabled ;
- un état active ;
- une transition ;
- une animation ;
- un bouton ;
- un champ ;
- une carte ;
- une fenêtre ;
- un panneau ;
- une navigation ;
- un header ;
- une sidebar ;
- une page complète ;
- jusqu'à l'identité visuelle globale d'une organisation.

Le système doit donc permettre une **personnalisation extrêmement fine**, sans perdre la cohérence générale du Design System.

---

# 3. VISION

EGEN doit pouvoir fonctionner avec plusieurs identités visuelles.

Une organisation utilisant EGEN ne doit pas être obligée d'adopter l'apparence graphique originale d'EGEN.

Elle doit pouvoir construire sa propre identité.

Par exemple :

### Organisation A

Une université souhaite une interface :

- sobre ;
- institutionnelle ;
- bleue ;
- avec des angles légèrement arrondis ;
- des panneaux très structurés ;
- peu d'effets visuels ;
- une typographie formelle.

### Organisation B

Une entreprise technologique souhaite :

- une interface sombre ;
- très moderne ;
- fortement translucide ;
- avec des effets de verre ;
- des couleurs vives ;
- des animations ;
- des composants très arrondis.

### Organisation C

Une administration souhaite :

- une interface très simple ;
- extrêmement lisible ;
- très contrastée ;
- peu d'animations ;
- des composants compacts ;
- une apparence institutionnelle.

Ces trois organisations doivent pouvoir utiliser **le même framework EGEN**, les mêmes composants fonctionnels et les mêmes applications, tout en ayant une identité visuelle complètement différente.

---

# 4. LE PRINCIPE FONDAMENTAL

Le système doit séparer clairement :

**ce que fait EGEN**

de

**la manière dont EGEN est présenté visuellement.**

Les fonctionnalités métier ne doivent pas être liées à une identité graphique particulière.

Un composant fonctionnel doit pouvoir conserver son comportement tout en changeant complètement d'apparence.

Par exemple, un bouton reste un bouton.

Mais son apparence peut être :

- carré ;
- arrondi ;
- très arrondi ;
- transparent ;
- translucide ;
- plein ;
- avec gradient ;
- avec bordure ;
- avec ombre ;
- minimaliste ;
- institutionnel ;
- futuriste ;
- sombre ;
- clair.

Même principe pour les autres composants.

---

# 5. LE THÈME DOIT ÊTRE GLOBAL MAIS AUSSI EXTRÊMEMENT GRANULAIRE

Nous voulons pouvoir définir le design à plusieurs niveaux.

## Niveau 1 — Identité globale

Le thème doit permettre de définir l'identité générale :

- couleurs principales ;
- couleurs secondaires ;
- couleurs neutres ;
- couleurs fonctionnelles ;
- typographies ;
- rayons ;
- ombres ;
- effets ;
- espacements ;
- densité ;
- animations ;
- transitions ;
- etc.

## Niveau 2 — Surfaces et environnements

Il doit être possible de définir l'apparence des différentes surfaces :

- arrière-plan général ;
- cartes ;
- panneaux ;
- menus ;
- popovers ;
- fenêtres ;
- dialogues ;
- overlays ;
- sidebar ;
- header ;
- footer ;
- zones de contenu ;
- etc.

## Niveau 3 — Composants

Chaque composant important doit pouvoir disposer de ses propres règles visuelles.

Exemples :

- Button ;
- Input ;
- Select ;
- Checkbox ;
- Radio ;
- Switch ;
- Card ;
- Modal ;
- Dialog ;
- Dropdown ;
- Tooltip ;
- Tabs ;
- Table ;
- Badge ;
- Alert ;
- Toast ;
- Navigation ;
- Sidebar ;
- Header ;
- etc.

## Niveau 4 — Variantes

Un même composant doit pouvoir avoir plusieurs variantes.

Exemple pour un bouton :

- primary ;
- secondary ;
- success ;
- warning ;
- danger ;
- ghost ;
- outline ;
- transparent ;
- etc.

## Niveau 5 — États

Chaque composant doit pouvoir gérer ses différents états :

- default ;
- hover ;
- focus ;
- active ;
- selected ;
- disabled ;
- loading ;
- readonly ;
- error ;
- success ;
- etc.

L'objectif est que la personnalisation puisse descendre jusqu'à ce niveau de précision lorsque cela est nécessaire.

---

# 6. IL FAUT UNE VÉRITABLE EXPÉRIENCE DE CRÉATION DE THÈME

EGEN doit intégrer dans son Core une application permettant de **construire visuellement les thèmes.**

Cette application ne doit pas être pensée comme un simple formulaire de configuration.

Elle doit être considérée comme un véritable **Theme Studio / Design System Studio**.

L'utilisateur doit pouvoir :

1. créer un thème ;
2. modifier un thème existant ;
3. importer un thème ;
4. exporter un thème ;
5. dupliquer un thème ;
6. créer une variante ;
7. modifier les couleurs ;
8. modifier les typographies ;
9. modifier les dimensions ;
10. modifier les rayons ;
11. modifier les ombres ;
12. modifier les effets ;
13. modifier les animations ;
14. modifier les transitions ;
15. modifier les composants ;
16. modifier leurs variantes ;
17. modifier leurs états ;
18. prévisualiser immédiatement le résultat ;
19. appliquer le thème ;
20. revenir à une version précédente.

---

# 7. LA PRÉVISUALISATION DOIT ÊTRE IMMÉDIATE

L'expérience doit être véritablement visuelle.

Lorsque l'utilisateur modifie une propriété du thème, il doit pouvoir constater immédiatement son impact.

Par exemple :

Il modifie le rayon général des composants.

Il doit immédiatement voir :

- les boutons changer ;
- les cartes changer ;
- les champs changer ;
- les panneaux changer ;
- les dialogues changer ;
- etc.

Il modifie la couleur primaire.

Il doit immédiatement voir les composants concernés changer.

Il modifie les ombres.

Il doit immédiatement voir les surfaces concernées évoluer.

Il modifie la typographie.

Il doit immédiatement voir l'interface évoluer.

**Il ne doit pas être nécessaire de recharger la page.**

---

# 8. APPLICATION DU THÈME À CHAUD

C'est un point essentiel.

Un thème doit pouvoir être appliqué dynamiquement.

L'utilisateur peut être dans une application EGEN et changer de thème.

Le changement doit être visible immédiatement.

Il ne doit pas être nécessaire :

- de reconstruire l'application ;
- de redéployer ;
- de modifier le code ;
- de redémarrer le serveur ;
- de recompiler manuellement ;
- de recharger complètement l'application.

Le système de thème doit être considéré comme une partie dynamique de l'expérience EGEN.

---

# 9. IMPORT ET EXPORT

Le thème doit pouvoir être représenté sous une forme structurée et portable.

Le JSON constitue notamment un format d'échange important.

Nous devons pouvoir avoir par exemple :

**Thème EGEN → JSON**

et :

**JSON → Thème EGEN**

Cela doit permettre notamment :

- sauvegarde ;
- partage ;
- duplication ;
- versionnement ;
- migration ;
- archivage ;
- transfert entre environnements ;
- génération automatique ;
- import depuis un autre outil ;
- export vers un autre environnement.

Le JSON doit pouvoir représenter l'ensemble du système de design, et pas seulement quelques variables de couleur.

---

# 10. L'EXEMPLE DE THÈME EXISTANT

Le fichier de thème que nous avons déjà défini doit être considéré comme une référence fonctionnelle importante pour comprendre la profondeur recherchée.

Il contient notamment des notions telles que :

- couleurs ;
- surfaces ;
- bordures ;
- typographie ;
- layout ;
- border radius ;
- shadows ;
- animations ;
- transitions ;
- effets ;
- blur ;
- transparence ;
- z-index ;
- icônes ;
- panneaux ;
- variantes light/dark ;
- tailles ;
- variantes de composants ;
- etc.

Nous voulons conserver cette richesse conceptuelle.

Cependant, nous ne voulons plus maintenir nous-mêmes un moteur de thème artisanal pour gérer tout cela.

**TokiForge doit devenir le moteur de gestion et de transformation du système de design dans EGEN.**

---

# 11. RÔLE DE TOKIFORGE

TokiForge doit être intégré au framework EGEN comme le moteur chargé de prendre en charge le système de tokens, de thèmes et leurs transformations.

L'objectif n'est pas de développer un deuxième moteur de design à côté de TokiForge.

Nous voulons au contraire exploiter TokiForge comme fondation.

Le principe général est :

**Theme Studio EGEN**

↓

**Thème EGEN structuré**

↓

**TokiForge intégré au Core**

↓

**Transformation / gestion du système de design**

↓

**Composants EGEN**

Le développeur ne doit donc pas recréer une solution équivalente à TokiForge.

Il doit utiliser TokiForge là où celui-ci apporte déjà les capacités nécessaires.

---

# 12. MAIS EGEN DOIT CONSERVER SON IDENTITÉ

TokiForge ne doit pas devenir le modèle métier d'EGEN.

EGEN doit rester maître de son concept de thème.

Nous devons pouvoir définir notre propre expérience de création et de gestion des thèmes.

Autrement dit :

**EGEN définit ce qu'est un thème dans son écosystème.**

**TokiForge fournit le moteur permettant de gérer et transformer ce système de design.**

Cela permet de conserver une liberté importante pour l'évolution future d'EGEN.

---

# 13. LE THEME STUDIO DOIT ÊTRE PENSÉ COMME UN OUTIL DE DESIGN

L'utilisateur ne doit pas être obligé de comprendre le fonctionnement interne des tokens.

Il doit pouvoir travailler visuellement.

Par exemple :

### Couleurs

L'utilisateur voit :

> Couleur principale

Il choisit la couleur.

Le système s'occupe du reste.

Même logique pour :

- secondaire ;
- surface ;
- arrière-plan ;
- texte ;
- bordure ;
- succès ;
- avertissement ;
- erreur ;
- information ;
- etc.

### Typographie

L'utilisateur doit pouvoir définir :

- famille ;
- taille ;
- poids ;
- hauteur de ligne ;
- style ;
- hiérarchie ;
- titres ;
- texte ;
- texte secondaire ;
- code ;
- etc.

### Formes

Il doit pouvoir définir :

- rayon ;
- épaisseur ;
- dimensions ;
- densité ;
- espacements.

### Effets

Il doit pouvoir contrôler :

- ombres ;
- transparence ;
- flou ;
- glass effect ;
- profondeur ;
- transitions ;
- animations.

---

# 14. LE SYSTÈME DOIT PERMETTRE DE PARTIR D'UN THÈME EXISTANT

Un utilisateur ne doit pas obligatoirement partir de zéro.

Il doit pouvoir :

**Créer → choisir un thème de base → personnaliser.**

Par exemple :

- EGEN Default ;
- EGEN Dark ;
- EGEN Light ;
- thème institutionnel ;
- thème entreprise ;
- thème minimal ;
- etc.

Puis modifier progressivement ce qui lui convient.

---

# 15. LE SYSTÈME DOIT PERMETTRE DE CRÉER DES THÈMES COMPLETEMENT DIFFÉRENTS

Il ne faut pas limiter le système à de petites variations autour du thème EGEN.

Un utilisateur doit pouvoir créer une identité radicalement différente.

Par exemple :

### Thème A

Minimaliste :

- blanc ;
- gris ;
- peu d'ombres ;
- très peu d'effets ;
- angles faibles.

### Thème B

Glassmorphism :

- surfaces translucides ;
- blur ;
- bordures translucides ;
- ombres ;
- profondeur ;
- effets lumineux.

### Thème C

Dark Enterprise :

- fond sombre ;
- surfaces très contrastées ;
- couleurs fonctionnelles fortes ;
- composants compacts.

Les trois doivent pouvoir être légitimes dans EGEN.

---

# 16. SCÉNARIO : UNE UNIVERSITÉ

Une université installe EGEN.

Elle souhaite que l'ensemble de son environnement numérique respecte son identité graphique.

L'administrateur ouvre le Theme Studio.

Il choisit un thème de base.

Il définit :

- sa couleur institutionnelle ;
- sa couleur secondaire ;
- son logo ;
- ses typographies ;
- ses rayons ;
- ses couleurs fonctionnelles ;
- ses panneaux ;
- ses boutons ;
- ses tableaux ;
- ses formulaires ;
- son menu ;
- son header.

Il visualise immédiatement le résultat.

Il valide.

Le thème devient alors le thème de son environnement EGEN.

Les différentes applications EGEN utilisant le système de design doivent automatiquement respecter cette identité lorsque leurs composants sont construits conformément au système.

---

# 17. SCÉNARIO : CHANGEMENT D'IDENTITÉ

Une organisation décide de changer son identité visuelle.

Elle ne doit pas avoir à modifier chaque application.

Elle modifie simplement son thème.

Par exemple :

Ancien bleu institutionnel :

**#123456**

Nouveau bleu :

**#0057B8**

Une modification du thème doit permettre de répercuter cette identité sur l'ensemble des composants concernés.

C'est précisément l'un des objectifs fondamentaux du Design System.

---

# 18. SCÉNARIO : DEUX THÈMES POUR UNE MÊME ORGANISATION

Une organisation peut vouloir disposer de plusieurs apparences.

Par exemple :

- thème officiel ;
- thème sombre ;
- thème événementiel ;
- thème saisonnier ;
- thème expérimental.

Elle doit pouvoir passer de l'un à l'autre sans modifier les applications.

---

# 19. SCÉNARIO : THÈME SOMBRE

Un utilisateur active le mode sombre.

Le système doit pouvoir basculer l'ensemble de l'interface vers les valeurs correspondantes.

Il ne s'agit pas simplement d'inverser les couleurs.

Le thème sombre peut avoir ses propres :

- surfaces ;
- bordures ;
- ombres ;
- contrastes ;
- transparences ;
- effets ;
- couleurs fonctionnelles ;
- composants.

Le mode sombre doit donc être considéré comme un véritable thème ou une véritable variante de thème.

---

# 20. SCÉNARIO : PERSONNALISATION TRÈS FINE

Un designer souhaite modifier uniquement l'apparence des cartes.

Il doit pouvoir accéder aux propriétés de la carte sans modifier le reste du système.

Il modifie par exemple :

- background ;
- border ;
- radius ;
- shadow ;
- padding ;
- état hover.

Le reste de l'interface reste inchangé.

C'est cette capacité de personnalisation granulaire que nous recherchons.

---

# 21. SCÉNARIO : PERSONNALISATION D'UN ÉTAT

Un designer souhaite que les boutons changent légèrement lorsqu'ils sont survolés.

Il doit pouvoir définir visuellement :

- la couleur ;
- la bordure ;
- l'ombre ;
- la transformation ;
- la transition.

Même principe pour :

- focus ;
- active ;
- disabled ;
- selected ;
- loading ;
- error ;
- etc.

---

# 22. SCÉNARIO : THÈME GÉNÉRÉ PAR UN SERVICE

À terme, un service externe ou interne à EGEN pourra générer automatiquement un thème complet.

Par exemple, un service reçoit :

> « Créer un thème moderne pour une université africaine avec une identité bleue et orange, sobre mais moderne. »

Le service produit un thème structuré.

Ce thème peut ensuite être importé dans EGEN.

EGEN l'affiche dans le Theme Studio.

L'utilisateur peut le modifier.

Puis il peut l'appliquer immédiatement.

Cela ouvre la possibilité d'intégrer plus tard :

- génération assistée par IA ;
- génération depuis une identité graphique ;
- génération depuis une charte graphique ;
- génération depuis une image ;
- génération depuis des couleurs existantes ;
- génération depuis un autre Design System.

Mais ces possibilités doivent venir **au-dessus du système de thème**, pas remplacer celui-ci.

---

# 23. LE THÈME DOIT ÊTRE RÉUTILISABLE

Un thème ne doit pas être lié à une seule page.

Il doit pouvoir être utilisé à différents niveaux de l'écosystème EGEN.

Il doit pouvoir représenter :

- une organisation ;
- un environnement ;
- une application ;
- une expérience particulière ;
- une variante.

La portée exacte pourra évoluer, mais le système doit être conçu dès le départ avec cette capacité de réutilisation.

---

# 24. COHÉRENCE DU DESIGN SYSTEM

La personnalisation ne doit pas signifier anarchie.

Le système doit permettre d'avoir :

**liberté + cohérence.**

L'utilisateur doit pouvoir personnaliser énormément de choses tout en conservant une logique globale.

Par exemple, si le thème définit :

- un rayon général ;
- une famille typographique ;
- une palette ;
- une profondeur ;
- une densité ;

les composants doivent pouvoir naturellement s'appuyer dessus.

Une modification globale doit pouvoir avoir un effet global.

Une modification spécifique doit pouvoir remplacer cette règle lorsqu'elle est volontaire.

---

# 25. LE SYSTÈME DOIT ÊTRE PENSÉ POUR LE LONG TERME

Nous ne construisons pas seulement un outil permettant de changer les couleurs d'EGEN.

Nous construisons la fondation visuelle de l'ensemble du framework.

Toutes les futures applications et tous les futurs composants EGEN devront pouvoir s'appuyer sur ce système.

Il faut donc éviter toute solution qui nous enfermerait dans :

- un seul thème ;
- une seule identité graphique ;
- une seule application ;
- un seul type de composant ;
- un seul environnement ;
- une configuration codée en dur.

---

# 26. NOUS VOULONS UN VRAI DESIGN SYSTEM

La vision finale est :

**EGEN Core**

→ composants

→ système de design

→ Theme Studio

→ gestion des thèmes

→ import/export

→ prévisualisation

→ application dynamique

→ personnalisation

→ variantes

→ états

→ identité visuelle.

Le système doit devenir une capacité native du framework.

---

# 27. CE QUI DOIT ÊTRE SUPPRIMÉ

Tout ce qui correspond à notre ancien système de gestion de thème doit être considéré comme obsolète.

Il ne faut pas conserver deux systèmes en parallèle.

Il ne faut pas :

- maintenir l'ancien moteur ;
- ajouter TokiForge à côté ;
- créer des mécanismes de synchronisation entre les deux ;
- garder une ancienne logique « au cas où ».

Nous voulons une **migration radicale et propre.**

L'ancien système doit disparaître du framework.

---

# 28. CE QUI DOIT ÊTRE CONSERVÉ

Il faut néanmoins conserver les besoins fonctionnels et les concepts utiles déjà identifiés.

Notamment :

- richesse du thème ;
- granularité ;
- light/dark ;
- composants ;
- variantes ;
- états ;
- effets ;
- typographie ;
- layout ;
- panneaux ;
- surfaces ;
- animations ;
- transitions ;
- responsive ;
- identité globale ;
- import/export ;
- prévisualisation.

Mais leur gestion doit désormais reposer sur une solution beaucoup plus robuste.

---

# 29. RÈGLE IMPORTANTE POUR LE DÉVELOPPEMENT

Ne pas commencer par reconstruire le système technique que nous avions avant.

Commencer par comprendre cette vision :

> EGEN doit disposer d'un véritable moteur de Design System permettant de définir l'apparence complète de son écosystème et de la modifier dynamiquement.

Ensuite seulement, intégrer TokiForge dans le Core afin qu'il prenne en charge la partie moteur correspondante.

Il faut éviter de reproduire nous-mêmes des fonctionnalités que TokiForge fournit déjà.

---

# 30. RÉSULTAT ATTENDU

À la fin de cette refonte, nous devons avoir dans EGEN :

### Un Theme Studio

Permettant de créer et modifier visuellement les thèmes.

### Un système d'import/export

Permettant notamment d'utiliser des thèmes JSON.

### Un système de prévisualisation

Permettant de voir immédiatement les changements.

### Un système d'application dynamique

Permettant d'appliquer les thèmes à chaud.

### Un système de personnalisation granulaire

Permettant d'aller du thème global jusqu'au composant et à ses états.

### Un moteur de Design System

Fourni par l'intégration de TokiForge dans EGEN.

### Une base extensible

Permettant d'ajouter de nouveaux composants et de nouvelles capacités sans devoir reconstruire le système de thème.

---

# 31. VISION FINALE

Le résultat recherché est simple à résumer :

**Nous voulons que le design d'EGEN devienne entièrement configurable.**

Un utilisateur ne doit pas simplement choisir entre :

> « thème clair »  
> « thème sombre »

Il doit pouvoir véritablement **construire son propre Design System.**

Il doit pouvoir partir de zéro ou d'un thème existant.

Il doit pouvoir modifier l'identité globale.

Il doit pouvoir descendre jusqu'aux détails.

Il doit pouvoir visualiser immédiatement.

Il doit pouvoir exporter.

Il doit pouvoir importer.

Il doit pouvoir partager.

Il doit pouvoir dupliquer.

Il doit pouvoir créer des variantes.

Il doit pouvoir appliquer.

Et surtout :

**il doit pouvoir changer l'apparence d'EGEN sans modifier le code des applications.**

C'est cette vision qui doit guider toute l'intégration.

---

# 32. DIRECTIVE FINALE

Nous ne cherchons donc pas à ajouter « un système de thèmes ».

Nous sommes en train de **remplacer complètement le système de design d'EGEN par une fondation professionnelle de Design System.**

Le Theme Studio fera partie du Core EGEN et permettra aux utilisateurs autorisés de définir visuellement leurs thèmes et de les importer/exporter sous une forme structurée.

TokiForge sera intégré directement dans le framework EGEN pour assurer le rôle de moteur de gestion et de transformation du système de design.

Le système doit être conçu pour que les composants EGEN soient construits **au-dessus de cette fondation**, et non indépendamment d'elle.

Ainsi, chaque nouveau composant créé dans EGEN devra pouvoir participer naturellement au système de thème.

L'objectif ultime est de faire d'EGEN un framework où **le comportement des applications et leur identité visuelle sont deux dimensions distinctes**, permettant une personnalisation extrêmement profonde sans remettre en cause le fonctionnement métier.

**Le design doit pouvoir évoluer indépendamment du code métier.**

**Le thème doit pouvoir évoluer indépendamment des applications.**

**Et l'utilisateur doit rester maître de son identité visuelle.**
