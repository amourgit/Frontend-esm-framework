# Vision et objectifs du système de création, de configuration et d'exécution des applications ESM

## 1. Contexte général

Le projet ESM, développé dans l'écosystème CIVITAS, a pour ambition de fournir un environnement unifié permettant de créer, d'intégrer, de configurer et d'exécuter des applications indépendantes. L'objectif n'est pas uniquement de proposer un framework destiné aux développeurs, mais de mettre à disposition une véritable plateforme dans laquelle la création d'applications peut se faire de plusieurs manières, selon les besoins, les compétences et les objectifs des utilisateurs.

Dans cette vision, une application ne doit pas nécessairement exister au préalable sous la forme d'un logiciel développé et compilé par une équipe technique. Elle doit également pouvoir être créée progressivement, à partir de déclarations et de configurations, sans exiger systématiquement l'intervention d'un développeur. Un utilisateur autorisé doit pouvoir définir une application, renseigner ses informations, organiser son fonctionnement, déclarer ses routes, définir ses pages et concevoir ses interfaces à partir des outils mis à sa disposition.

Cette possibilité ne doit toutefois pas constituer une limite pour les développeurs. ESM doit également permettre la création d'applications entièrement développées en code, avec les technologies et les pratiques de développement prises en charge par le framework. Ces applications doivent pouvoir rejoindre le même environnement, être reconnues, déclarées et exploitées dans les mêmes conditions générales que les applications créées par configuration.

La finalité est donc de disposer d'un environnement dans lequel les applications, qu'elles soient développées en code ou créées par configuration, restent indépendantes, réutilisables et intégrables dans l'écosystème ESM.

Pour atteindre cet objectif, CIVITAS s'appuie sur plusieurs produits complémentaires : EGEN Kernel pour le déploiement et la supervision des services, Penpot pour la conception des interfaces, Tweakcn pour la création des thèmes, TokiForge pour la gestion et l'application des configurations visuelles, et ESM pour la déclaration, l'intégration et l'exécution des applications.

Ces produits ont des responsabilités distinctes. Ils doivent pouvoir fonctionner indépendamment, tout en collaborant pour offrir une expérience cohérente de création et d'utilisation des applications.

## 2. Objectifs généraux

Le premier objectif est de rendre la création d'applications accessible sans imposer le développement informatique comme unique moyen de production. Il doit être possible de créer une application à partir d'une définition complète, de lui donner une identité, de déclarer ses fonctionnalités attendues, ses routes, ses informations de navigation et ses règles d'accès, puis de concevoir ses interfaces sans avoir à écrire systématiquement du code.

Le deuxième objectif est de préserver la liberté des développeurs. Les applications développées traditionnellement doivent conserver leur autonomie. Elles ne doivent pas être obligées d'utiliser les outils de conception visuelle ou le système déclaratif pour exister. Elles doivent simplement pouvoir être déclarées et intégrées dans ESM afin de bénéficier de son environnement d'exécution et de ses services communs.

Le troisième objectif est de séparer clairement la définition d'une application de la conception de ses interfaces. Une application ne se limite pas à ses pages. Elle possède une identité, des métadonnées, des routes, des règles d'accès, des dépendances, des paramètres et un fonctionnement qui doivent être définis indépendamment de son apparence. La conception des pages constitue une partie distincte de sa création.

Le quatrième objectif est de permettre une évolution continue des applications. Une interface ou un thème doit pouvoir être modifié, enregistré, publié et actualisé sans devoir systématiquement reconstruire ou redéployer l'ensemble de l'application. Les modifications doivent pouvoir être prises en compte selon leur nature, tout en préservant la stabilité des applications déjà en fonctionnement.

Enfin, l'ensemble doit favoriser la modularité et la réutilisation. Les applications, les composants, les configurations et les thèmes doivent pouvoir évoluer indépendamment. Une modification apportée à un élément ne doit pas imposer de reconstruire inutilement les autres éléments de l'écosystème.

## 3. Périmètre des produits et responsabilités

### 3.1. EGEN Kernel : déploiement et supervision des services

EGEN Kernel est le socle chargé de prendre en charge le déploiement et la supervision des différents services indépendants utilisés par l'écosystème CIVITAS.

Dans le cadre de ce projet, il doit notamment permettre de déployer Penpot, Tweakcn, TokiForge et les services nécessaires à leur intégration. Chaque service doit disposer de son propre environnement de fonctionnement et conserver son état, ses données et son cycle de vie.

EGEN Kernel intervient dans la gestion de ces services en tant que produits logiciels indépendants. Il assure leur mise à disposition et leur supervision, sans prendre en charge leur fonctionnement interne ni leurs responsabilités propres.

Il ne lui revient donc pas de concevoir les interfaces, de gérer les thèmes, de définir les composants ESM ou d'interpréter les configurations produites par les outils. Ces responsabilités appartiennent aux produits concernés.

### 3.2. Penpot : conception des interfaces

Penpot est l'outil de conception visuelle retenu pour produire les interfaces des applications.

Il doit permettre aux concepteurs de créer les pages, d'organiser les éléments visuels, de structurer les écrans et de travailler sur les différentes représentations d'une application. Il constitue l'espace de conception graphique dans lequel les interfaces sont imaginées, construites et modifiées.

Dans le cadre de l'intégration avec ESM et TokiForge, Penpot doit également permettre d'établir une correspondance entre les éléments conçus et les véritables composants disponibles dans ESM. Cette association est essentielle : l'objectif n'est pas seulement de reproduire visuellement une interface, mais de préparer une conception pouvant être interprétée et appliquée à partir des composants réellement disponibles dans le framework.

Le concepteur doit ainsi pouvoir travailler avec les éléments visuels tout en sachant à quels composants de l'environnement ESM ils correspondent, quelles possibilités ils offrent et quelles propriétés peuvent leur être associées.

Penpot conserve son rôle de produit de conception. Ses documents, ses projets et son environnement de travail restent indépendants de TokiForge et d'ESM.

### 3.3. Tweakcn : création et personnalisation des thèmes

Tweakcn est l'outil retenu pour la création visuelle des thèmes.

Il doit permettre de concevoir et de personnaliser l'identité visuelle des applications à travers les différentes propriétés de présentation : couleurs, typographies, rayons, ombres et autres éléments de style.

L'objectif est de donner aux utilisateurs la possibilité de créer des thèmes sans devoir modifier directement le code des applications. Les thèmes produits doivent pouvoir être enregistrés, modifiés et transmis à TokiForge pour être pris en compte dans l'environnement ESM.

Tweakcn conserve son propre fonctionnement et ses propres données. Il reste un outil de création de thèmes et ne devient pas le système chargé de les distribuer ou de les appliquer dans les applications.

### 3.4. TokiForge : gestion et application des configurations visuelles

TokiForge est le système chargé de prendre en charge les configurations d'interfaces et les thèmes produits par les outils de conception.

Il doit recevoir les productions issues de Penpot et de Tweakcn, les rendre exploitables dans l'environnement ESM, en assurer la gestion et permettre leur application dans les applications concernées.

Son rôle ne se limite pas à recevoir des fichiers de conception. Il doit garantir que les configurations prises en charge correspondent aux composants et aux possibilités réellement disponibles dans ESM. Il doit également permettre de gérer les différentes versions, de distinguer les configurations en préparation de celles qui sont publiées et de conserver un historique des évolutions.

TokiForge doit pouvoir prendre en compte les modifications apportées aux interfaces et aux thèmes, puis rendre les nouvelles versions disponibles pour les applications concernées.

Il doit également permettre une gestion cohérente des thèmes à différents niveaux. Un thème général peut servir de référence, tandis qu'une application, une organisation, un service ou un utilisateur autorisé peut disposer de personnalisations particulières. Ces personnalisations doivent pouvoir être appliquées sans obliger à redéfinir l'ensemble du thème initial.

Il est important de distinguer les deux composantes de son intervention. Le service TokiForge assure la gestion, la validation, le versionnement et la distribution des configurations. Le runtime TokiForge, intégré au framework ESM, assure leur application effective dans les applications.

TokiForge n'a pas vocation à devenir un outil obligatoire pour toutes les applications ESM. Une application développée en code doit pouvoir fonctionner indépendamment de lui. Son utilisation intervient lorsque l'application souhaite exploiter le système de configuration visuelle et de thèmes proposé par TokiForge.

### 3.5. ESM : déclaration, intégration et exécution des applications

ESM constitue l'environnement dans lequel les applications sont déclarées, reconnues, intégrées et exécutées.

Sa responsabilité ne se limite pas au chargement de pages ou de composants. Il doit permettre de prendre en charge l'existence complète d'une application dans l'écosystème, depuis sa déclaration jusqu'à son utilisation.

Chaque application doit pouvoir disposer d'une définition propre, contenant toutes les informations nécessaires pour l'identifier, la présenter et déterminer son fonctionnement dans ESM.

Cette définition doit être indépendante des configurations visuelles. Elle représente l'application en tant que produit logiciel, tandis que les configurations de TokiForge décrivent les interfaces qui lui sont associées.

ESM doit ensuite être capable de réunir ces informations et de mettre l'application à disposition dans son environnement d'exécution.

## 4. La déclaration complète des applications

La création d'une application doit commencer par sa déclaration. Cette étape est indispensable, que l'application soit créée visuellement ou développée en code.

Chaque application doit posséder une identité propre et un ensemble d'informations permettant de la reconnaître et de la gérer dans ESM.

La déclaration doit notamment comprendre son identifiant, son nom, sa description, son icône, sa version, sa catégorie, son éditeur et les autres métadonnées nécessaires à son identification et à sa gestion.

Elle doit également décrire son organisation fonctionnelle dans l'environnement ESM. Cela comprend notamment ses routes, ses chemins d'accès, ses éventuelles routes secondaires, ses informations de navigation, ses menus, ses règles de visibilité et les autorisations nécessaires pour accéder à ses différentes parties.

Les dépendances de l'application, ses paramètres, ses possibilités d'intégration et les informations relatives à son cycle de vie doivent également être déclarés. L'objectif est de disposer d'une définition suffisamment complète pour qu'ESM puisse reconnaître l'application et déterminer comment elle doit être intégrée et utilisée.

Cette déclaration ne doit pas être confondue avec la conception de ses pages. Déclarer une route ne signifie pas concevoir l'écran correspondant. Définir une application ne signifie pas encore déterminer son apparence.

Une application peut donc être déclarée avant que ses interfaces soient conçues. Elle peut également disposer de toutes ses informations de déclaration alors que certaines pages restent encore à réaliser.

Cette séparation permet de faire évoluer indépendamment la définition de l'application et la conception de ses interfaces.

## 5. La conception des interfaces et des pages

Une fois l'application déclarée, ses interfaces peuvent être conçues à l'aide de Penpot et prises en charge par TokiForge.

La conception doit porter sur les pages réellement destinées à être utilisées dans l'application. Chaque page peut être organisée à partir des composants disponibles dans ESM, avec leurs propriétés, leurs variantes et leurs possibilités de présentation.

L'objectif est de permettre la création d'interfaces cohérentes avec le framework, sans imposer aux concepteurs de développer manuellement chaque élément.

Les pages doivent pouvoir être associées aux routes déclarées dans l'application. Ainsi, une route donnée correspond à une page déterminée, et l'environnement ESM sait quelle interface présenter lorsque l'utilisateur accède à cette route.

Cette relation doit être clairement définie. La déclaration des routes appartient à la définition de l'application ; la conception de leur contenu visuel appartient au travail réalisé avec Penpot et pris en charge par TokiForge.

Les concepteurs doivent pouvoir modifier les pages, réorganiser leurs éléments et faire évoluer leur présentation sans devoir redéfinir l'ensemble de l'application.

De la même manière, les modifications apportées à la définition de l'application ne doivent pas entraîner automatiquement une refonte des interfaces lorsque celle-ci n'est pas nécessaire.

## 6. La création et la gestion des thèmes

La présentation des applications ne doit pas être figée dans leur conception initiale.

Les thèmes doivent pouvoir être créés et personnalisés indépendamment des pages. Un utilisateur doit pouvoir faire évoluer les couleurs, les typographies, les formes et les autres propriétés visuelles sans devoir reconstruire les interfaces concernées.

Tweakcn constitue l'outil de création visuelle des thèmes. Les thèmes produits sont transmis à TokiForge, qui assure leur prise en charge et leur mise à disposition dans ESM.

Cette organisation doit également permettre de partager un thème entre plusieurs applications. Un thème commun peut servir de référence à plusieurs applications, tandis que chacune peut conserver les adaptations qui lui sont propres.

La personnalisation doit pouvoir être organisée selon le contexte d'utilisation. Un thème général peut être défini pour l'ensemble de l'environnement, puis adapté à une organisation, à une application, à un service ou à un utilisateur lorsque les droits et les règles de gestion le permettent.

Les personnalisations particulières doivent uniquement modifier les éléments concernés et conserver les autres valeurs héritées. L'objectif est d'éviter la multiplication de thèmes entièrement indépendants alors qu'ils partagent une même identité visuelle.

## 7. Le fonctionnement entre les différents produits

Les différents produits doivent collaborer sans perdre leur indépendance.

Lorsqu'une conception est créée ou modifiée dans Penpot, cette modification doit pouvoir être prise en compte par le système d'intégration CIVITAS. Les informations nécessaires sont récupérées, associées aux composants ESM concernés et transmises à TokiForge dans un format exploitable.

Lorsqu'un thème est créé ou modifié dans Tweakcn, sa nouvelle version doit également pouvoir être récupérée et transmise à TokiForge.

Les modifications doivent être enregistrées avant d'être annoncées comme disponibles. Les notifications servent à signaler qu'une nouvelle production ou une nouvelle version existe et qu'elle peut être prise en charge. Elles ne doivent pas remplacer l'enregistrement des données elles-mêmes.

TokiForge reçoit ces informations, vérifie les configurations concernées, les prend en charge et les rend disponibles pour les applications ESM auxquelles elles sont destinées.

Lorsqu'une nouvelle version est publiée, les applications concernées doivent pouvoir en être informées et récupérer cette version. Le runtime TokiForge présent dans ESM assure alors son application.

Ce fonctionnement doit permettre de distinguer la création, l'enregistrement, la validation, la publication et l'application d'une configuration. Chacune de ces étapes possède une responsabilité précise.

Aucun des outils de conception ne doit avoir à gérer directement l'exécution des applications. De la même manière, ESM ne doit pas avoir à reproduire les fonctions de conception de Penpot ou de Tweakcn.

## 8. Les deux modes d'application des configurations

Les configurations doivent pouvoir être prises en compte à deux moments différents.

Le premier concerne la préparation et le déploiement d'une application. Lorsqu'une application est préparée pour être mise à disposition, les versions des interfaces et des thèmes qui lui sont destinées doivent pouvoir être sélectionnées et associées à sa définition. L'application démarre ainsi avec un ensemble de configurations identifié et maîtrisé.

Cette possibilité est importante pour garantir que les applications disposent d'une présentation cohérente dès leur mise en service et que leur état puisse être reproduit lors d'un nouveau déploiement.

Le deuxième concerne les modifications effectuées après la mise en service. Lorsqu'un thème ou une interface est modifié et qu'une nouvelle version est publiée, les applications concernées doivent pouvoir prendre en compte cette évolution sans qu'il soit nécessaire de redéployer systématiquement toute l'application.

Les changements qui concernent uniquement la présentation doivent pouvoir être appliqués directement lorsque cela est compatible avec les possibilités des composants utilisés. Les changements plus importants, qui touchent à la structure ou au fonctionnement de l'application, peuvent nécessiter une opération de rechargement ou une nouvelle mise à disposition.

Dans les deux cas, les applications doivent conserver un fonctionnement stable. Une nouvelle configuration qui n'est pas valide ou qui n'est pas compatible ne doit pas remplacer une version déjà fonctionnelle.

## 9. Les applications créées par configuration

Le système doit permettre à un utilisateur autorisé de créer une application sans passer par un développement frontend traditionnel.

L'expérience attendue commence par la déclaration de l'application. L'utilisateur renseigne son identité, ses métadonnées, ses routes, ses informations de navigation, ses autorisations et les autres éléments nécessaires à sa définition.

Il passe ensuite à la conception des interfaces. Il peut créer les pages, organiser les composants, définir leur présentation et associer les pages aux routes correspondantes.

Il peut enfin sélectionner ou personnaliser les thèmes à utiliser.

L'ensemble de ces éléments constitue une application configurable. Elle ne doit pas être considérée comme une simple maquette ou comme une succession de pages statiques. Elle doit être reconnue par ESM comme une véritable application, avec sa propre identité, ses déclarations et ses interfaces.

Cette approche doit permettre de créer des applications adaptées à des besoins variés, notamment des applications administratives, des outils internes, des espaces de gestion ou des interfaces destinées à différents services.

La création par configuration ne doit toutefois pas être présentée comme une génération automatique de toutes les fonctionnalités métier. Une interface de gestion, par exemple, doit pouvoir être reliée aux services et aux données nécessaires à son fonctionnement. La configuration des pages ne remplace pas les traitements métier qui doivent être assurés par les services concernés.

## 10. Les applications développées en code

La création par configuration doit coexister avec le développement traditionnel.

Les développeurs doivent pouvoir créer des applications indépendantes, avec leurs propres composants, leurs propres fonctionnalités et leur propre organisation interne.

Ces applications doivent ensuite pouvoir être déclarées dans ESM à travers les mêmes principes de déclaration. Elles doivent posséder une identité, des métadonnées, des routes, des informations d'intégration et les autres éléments nécessaires à leur reconnaissance dans l'environnement.

Elles ne doivent pas être contraintes de reconstruire leurs interfaces dans Penpot ni d'utiliser TokiForge pour fonctionner.

En revanche, elles doivent pouvoir exploiter les possibilités communes de l'écosystème lorsqu'elles en ont besoin, notamment les composants ESM, les thèmes TokiForge et les mécanismes d'intégration disponibles.

Cette liberté garantit que le système ne devient pas un environnement fermé réservé aux applications configurables. Il reste ouvert aux développements spécifiques et aux applications dont les besoins nécessitent du code.

L'objectif est que les deux catégories d'applications puissent coexister dans ESM, sans créer deux environnements distincts.

## 11. L'expérience attendue pour les utilisateurs

L'expérience globale doit être cohérente et progressive.

Un utilisateur qui souhaite créer une application doit pouvoir commencer par la définir, sans être obligé de concevoir immédiatement toutes ses pages. Il doit pouvoir renseigner les informations nécessaires, organiser ses routes et préparer son application avant de passer à la conception visuelle.

Lorsqu'il travaille sur les interfaces, il doit pouvoir utiliser Penpot pour concevoir ses pages et retrouver les composants réellement disponibles dans ESM. Il doit pouvoir comprendre les possibilités de ces composants et les associer correctement aux éléments de sa conception.

Lorsqu'il souhaite personnaliser l'apparence de son application, il doit pouvoir utiliser Tweakcn pour produire un thème, puis retrouver ce thème dans le système de gestion de TokiForge.

Après publication, les configurations doivent être mises à disposition des applications concernées. L'utilisateur ne doit pas avoir à répéter manuellement les mêmes opérations dans chaque application lorsque les éléments peuvent être partagés.

Les modifications ultérieures doivent être prises en compte dans un processus maîtrisé. L'utilisateur doit pouvoir faire évoluer une interface ou un thème sans devoir reprendre toute la définition de l'application.

Pour les développeurs, l'expérience doit rester aussi indépendante que possible. Ils doivent pouvoir construire leurs applications avec leurs propres méthodes, puis les intégrer dans ESM sans être obligés de passer par le processus de création visuelle.

## 12. Indépendance et continuité de fonctionnement

L'indépendance des produits constitue une exigence fondamentale.

Penpot, Tweakcn et TokiForge doivent être déployés comme des services indépendants, chacun avec son propre état, ses propres données et son propre cycle de vie. Leur collaboration ne doit pas les transformer en un seul produit indivisible.

Penpot doit pouvoir continuer à conserver et à gérer les projets de conception, même lorsque TokiForge n'est pas disponible. Tweakcn doit également pouvoir conserver ses projets de thèmes indépendamment du système chargé de les appliquer.

TokiForge doit pouvoir gérer les configurations déjà reçues et publiées sans dépendre en permanence des outils qui les ont produites.

De son côté, ESM doit permettre aux applications déjà mises à disposition de continuer à fonctionner avec leur dernière configuration valide, même lorsque le service TokiForge est temporairement indisponible.

Cette indépendance doit aussi être préservée au niveau des applications. Une application créée par configuration ne doit pas être confondue avec TokiForge, et une application développée en code ne doit pas être confondue avec ESM. Chaque élément conserve sa propre responsabilité et son propre cycle de vie.

## 13. Résultat attendu

Le résultat recherché est un environnement CIVITAS dans lequel la création d'applications ne dépend plus exclusivement du développement traditionnel.

Un utilisateur doit pouvoir déclarer une application, lui donner une identité complète, définir ses routes, organiser sa navigation, préparer ses autorisations et concevoir ses pages à l'aide des outils disponibles. Il doit également pouvoir créer et appliquer des thèmes sans intervenir directement dans le code des applications.

Un développeur doit, de son côté, pouvoir créer une application en code, conserver son indépendance et l'intégrer dans le même environnement ESM.

Penpot doit rester l'outil de conception des interfaces. Tweakcn doit rester l'outil de création des thèmes. TokiForge doit assurer la gestion et l'application des configurations visuelles. ESM doit assurer la déclaration, l'intégration et l'exécution des applications. EGEN Kernel doit assurer le déploiement et la supervision des services indépendants.

Ces responsabilités doivent rester clairement séparées, tout en permettant aux produits de collaborer.

À terme, CIVITAS doit disposer d'un environnement dans lequel une application peut être créée par configuration ou par développement, déclarée de manière complète, dotée de ses propres interfaces, personnalisée par des thèmes, puis mise à disposition dans ESM.

La valeur centrale de cette démarche est de réunir, dans un même écosystème, la liberté du développement logiciel et la souplesse de la création configurable, sans sacrifier l'indépendance des applications, la modularité des produits ni la possibilité de faire évoluer chaque élément séparément.
