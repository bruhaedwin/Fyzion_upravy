# Fyzion+

Neoficiální desktopový pomocník pro [Fyzion](https://app.fyzion.cz/). Přidává hledání volných termínů, plánování sérií, přípravu návštěvy z karty klienta a volitelné úpravy vzhledu.

**Verze 1.8.0 stable** · Uživatelský skript pro Tampermonkey · České rozhraní · Desktop stable

> Skript návštěvy automaticky neukládá. Výsledky hledání nejsou rezervace. Před uložením vždy zkontrolujte klienta, službu, terapeuta, místnost, délku a datum s časem.

## Instalace

1. Nainstalujte [Tampermonkey](https://www.tampermonkey.net/) do svého desktopového prohlížeče.
2. Otevřete [instalační odkaz Fyzion+](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js) a potvrďte instalaci.
3. Pokud se zobrazí pouze zdrojový kód, vytvořte nový skript v Tampermonkey, nahraďte jeho obsah celým souborem `fyzion-helper.user.js` a uložte.
4. Přihlaste se do Fyzionu a obnovte stránku.
5. Otevřete kalendář terapeutů, aby se načetl jejich seznam a přihlášený přístup k dostupnosti.

Průvodce instalací: https://bruhaedwin.github.io/Fyzion_upravy/

Ponechte aktivní pouze jednu kopii skriptu. Pokud prohlížeč vyžaduje zvláštní povolení uživatelských skriptů, povolte je podle pokynů Tampermonkey.

### Aktualizace a návrat na předchozí verzi

Otevřete instalační odkaz a potvrďte aktualizaci, nebo nahraďte celý obsah stávajícího skriptu. Uložte a obnovte Fyzion. Verze je uvedená v záhlaví panelu Volné termíny.

Před aktualizací doporučujeme export nastavení a uložení předchozího souboru skriptu. Pro návrat nahraďte obsah skriptu touto zálohou a obnovte stránku; případně obnovte i odpovídající export nastavení. Kompatibilita novějšího exportu se starší verzí není zaručená.

Samostatný soubor `fyzion-style.user.css` je původní doplněk pro Stylus. Současný userscript obsahuje vlastní nastavení vzhledu. Při používání současného skriptu starý styl vypněte, aby nepřebíjel jeho přepínače.

## Hlavní funkce

| Funkce | Chování |
| --- | --- |
| Volné termíny | Hledání pro vybrané terapeuty, délky 15/30/45/60 minut a období 1–180 dní. |
| První návštěva do 40 dní | Lhůta od zadaného data vystavení FT poukazu, včetně 40. dne. |
| Nepravidelná pracovní doba | Volitelné zahrnutí přesčasů, také ve dnech bez pravidelné směny. |
| Dostupnost klienta | Omezení podle dnů týdne a času od/do. |
| Série návštěv | Kompletní i neúplné návrhy, volitelně u jednoho terapeuta, alespoň jeden celý volný den mezi návštěvami. |
| Alternativy | Nabídka jiného času nebo dne a úprava návrhu série. |
| Kontrolní náhled | Obsazenost terapeuta, navržený termín a začátek a konec pracovní doby, včetně dělených směn a volitelných přesčasů. |
| Najít termín na kartě klienta | Otevření hledání s kontextem konkrétního klienta. |
| Připravit návštěvu | Otevření původního formuláře Fyzionu a doplnění údajů bez automatického uložení. |
| Zobrazit terapeuty | Pomocná volba Právě pracují, Zobrazit všechny terapeuty a Skrýt všechny terapeuty. |
| Nastavení pod + | Moduly, vzhled, výchozí hledání, seznam prohledávaných terapeutů a export/import. |

## Hledání a série termínů

Dlaždice **Volné termíny** se zobrazuje v kalendáři. Na kartě klienta použijte naše tlačítko **Najít termín** nad původním tlačítkem nové návštěvy.

1. Vyberte terapeuta nebo volbu Všichni a jednotlivé osoby v seznamu.
2. Nastavte délku, datum začátku a případně dostupnost klienta.
3. Rozsah období změňte v **+ → Výchozí hledání**.
4. Pro sérii zapněte modul **Naplánovat sérii termínů**, nastavte počet a případně jednoho terapeuta.
5. Klikněte na **Najít termíny** a rozbalte nalezený den nebo návrh série.

Kliknutí na datum a čas otevře kalendář. Tlačítko Náhled načte aktuální obsazenost a pracovní rozvrh. Alternativy mohou změnit jednotlivé termíny návrhu.

Návrh série nic neukládá. Hromadné ukládání celé série není součástí této verze. Výsledky starší než dvě minuty jsou označené; před použitím starších výsledků spusťte nové hledání. Vyhodnocování času používá pásmo Europe/Prague.

### První návštěva do 40 dní

Zapněte **První návštěva do 40 dní** a vyplňte **Vystavení FT poukazu**. Lhůta vychází výhradně z tohoto data, nikoli z dneška ani z data „Hledat od“. Poslední povolený den první návštěvy je datum vystavení + 40 kalendářních dní včetně. Například poukaz vystavený 1. 10. 2026 umožní první návštěvu nejpozději 10. 11. 2026. Rozsah hledání se tím automaticky nemění.

V sérii se limit týká první návštěvy; další mohou následovat později v rozsahu hledání. Prázdné nebo neplatné datum při zapnutém limitu hledání zastaví a zobrazí vysvětlení. Při vypnutém limitu se datum nepoužívá. Změna data vymaže výsledky, proto spusťte nové hledání.

Datum poukazu se nepředvyplňuje dneškem a neukládá se do nastavení ani exportu. Při otevření hledání pro jiného klienta se vymaže.

### Nepravidelná pracovní doba (přesčas)

V **+ → Moduly → Zahrnout nepravidelnou pracovní dobu (přesčas)** je ve výchozím stavu zapnutá podpora nepravidelných ordinačních hodin Fyzionu. Ty rozšiřují běžný rozvrh i na dny bez pravidelné směny. Překrývající se pracovní úseky se sloučí. Návštěvy, volno, přestávky a ostatní blokace se nadále odečítají.

Vypnutí přepínače omezí hledání, série, alternativy, náhled a závěrečné ověření před přípravou návštěvy na pravidelný rozvrh. Změna vymaže dosavadní výsledky. Volba se ukládá a přenáší exportem/importem nastavení.

## Příprava návštěvy z karty klienta

1. Otevřete kartu požadovaného klienta a klikněte na **Najít termín**.
2. Vyhledejte termín nebo sérii a u konkrétního termínu zvolte **Připravit návštěvu**.
3. Vyčkejte bez klikání a psaní do stránky. Skript ověří dostupnost, otevře formulář, počká na klienta, doplní službu, terapeuta, délku, datum a čas a znovu ověří dostupnost.
4. Zkontrolujte všechny údaje a návštěvu uložte běžným tlačítkem Fyzionu.

Tlačítko Připravit návštěvu se skrývá v kalendáři a u výsledků bez kontextu klienta. Původní tlačítko Najít termín uvnitř formuláře návštěvy je skryté, aby se nepletlo s tlačítkem Fyzion+ na kartě klienta.

| Délka návrhu | Automatická služba |
| --- | --- |
| 15 minut | Terapie, rozlišená údajem 15 minut v nabídce. |
| 30 minut | Terapie, rozlišená údajem 30 minut v nabídce. |
| 45 minut | komplexní terapie 45min, s kontrolou délky v nabídce. |
| 60 minut | Automatické mapování chybí; službu vyberte ručně. |

Při nenalezené či nejednoznačné službě může skript doplnit ostatní údaje a upozornit na ruční výběr služby. Po ruční změně služby znovu zkontrolujte délku i čas. Konečná kontrola služby používá její zobrazovaný název; nenahrazuje kontrolu správné položky uživatelem.

Klienta předvyplňuje Fyzion, skript jej nepřepisuje. Existující formulář využije jen tehdy, pokud z něj dokáže ověřit odpovídající ID klienta. Jinak jej zavřete a spusťte přípravu znovu z karty. Změna klienta, stránky, formuláře nebo ruční interakce během přípravy operaci přeruší.

Celkový limit přípravy je 60 sekund. Hledání má limit 90 sekund a načtení náhledu 30 sekund. Po chybě či zrušení mohou ve formuláři zůstat částečně doplněné údaje.

### Hlášky přípravy

V **+ → Moduly → Zobrazovat hlášky přípravy návštěvy** lze vypnout průběžné zprávy. Volba se ukládá. Konečný výsledek, chyba a upozornění na ruční kontrolu služby zůstávají viditelné i při vypnutých průběžných zprávách. Hlášení zavřete tlačítkem **Zavřít hlášení**.

## Zobrazit terapeuty

Nenápadné tlačítko v kalendáři otevírá nabídku se třemi akcemi. Po zvolení akce se nabídka zavře.

- **Právě pracují:** zahrne terapeuty v aktuální pravidelné či nepravidelné pracovní době bez právě probíhajícího volna a také terapeuty s právě probíhající návštěvou či jinou běžnou událostí mimo rozvrh. Samotné volno a přestávka se za práci nepočítají; nepravidelné ordinační hodiny jsou pracovní dobou i při zobrazení jako pozadí. Probíhající běžná událost má při souběhu přednost před volnem.
- **Zobrazit všechny terapeuty:** zapne všechny terapeuty povolené v nastavení Fyzion+.
- **Skrýt všechny terapeuty:** vypne jejich sloupce v kalendáři.

Právě pracují se posuzuje podle skutečného aktuálního času v Praze, nikoli podle právě prohlíženého dne kalendáře. Akce nahrazují aktuální výběr sloupců. Výběr sloupců je oddělený od terapeutů vybraných pro hledání termínů. Volba Právě pracují vždy zohledňuje skutečné přesčasy, i když jsou ve vyhledávání vypnuté.

## Nastavení pod tlačítkem +

| Sekce | Nastavení |
| --- | --- |
| Moduly | Objednání z karty klienta, průběžné hlášky přípravy, Zobrazit terapeuty, plánování série a zahrnutí přesčasů. |
| Vzhled Fyzionu | Skrytí původního modrého tlačítka + Návštěva, kontrast a barva volna, skrytí náhledu při najetí, časové popisky, skrytí nabídky Stav návštěvy a odlišení šrafovaných událostí. |
| Výchozí hledání | Délka návštěvy a počet prohledávaných dní. |
| Přenos na jiný počítač | Export/import nastavení a obnovení polohy panelu. |
| Terapeuti dostupní pro hledání | Sbalitelný seznam osob povolených pro hledání. |

Skrytí původního tlačítka + Návštěva jej neodstraní z aplikace; příprava návštěvy Fyzion+ jej může dál použít. Pro obnovení ručního přístupu vypněte jeho skrývání v sekci Vzhled Fyzionu.

Ve spodní části nabídky **+** je odkaz **Návod**, který otevře toto README v nové kartě.

### Uložená data

V místním úložišti webu se uchovává nastavení, poloha panelu, povolení/skrytí terapeutů, výběr pro hledání a pomocný seznam ID a jmen terapeutů až na sedm dní. Dostupnost klienta se po obnovení stránky vymaže. Obsazenost se pro hledání načítá znovu.

Export obsahuje společné nastavení a ID trvale skrytých terapeutů. Neobsahuje data pacientů, celý aktuální výběr terapeutů ani pomocný seznam jejich jmen. Import nahrazuje odpovídající místní nastavení. Vymazání dat webu může uložené volby odstranit.

Nastavení ani pomocný seznam nejsou odděleny podle účtu/pracoviště. Při změně účtu ve stejném profilu obnovte stránku, otevřete kalendář a zkontrolujte výběr terapeutů.

## Data, bezpečnost a omezení

- Skript běží na `https://app.fyzion.cz/*` a pro dostupnost používá přihlášené GET požadavky na `https://api.fyzion.cz`.
- Přihlašovací hlavičky drží v paměti stránky; neukládá je do exportu ani nastavení.
- Uchovávaná dostupnost a vlastní náhled neobsahují jména pacientů ani poznámky. Pomocný seznam terapeutů jejich jména obsahuje.
- Skript neobsahuje vlastní analytiku ani odesílání údajů na jiný externí server.
- Hledání a náhled neověřují dostupnost místnosti ani kolize klienta u jiných terapeutů. Vycházejí z pravidelného týdenního rozvrhu, volitelných nepravidelných ordinačních hodin (ExtraOfficeHours) a načtených blokací.
- Ověření dostupnosti není rezervace. Jiný uživatel může mezitím termín obsadit.
- Nepodporované rozvrhy, nejednoznačné časy při změně letního času nebo neúplná/stránkovaná data mohou hledání zastavit.
- Změna rozhraní nebo API Fyzionu může vyžadovat úpravu skriptu.
- Jde o desktopový userscript. Mobilní používání ani matice všech prohlížečů nejsou pro tuto verzi ověřené. Neobsahuje vzdálený tisk ani samostatné rozšíření prohlížeče.

## Řešení potíží

| Problém | Postup |
| --- | --- |
| Fyzion+ není vidět | Zkontrolujte aktivní skript, oprávnění Tampermonkey a obnovte stránku. Volné termíny se zobrazují pouze v kalendáři. |
| Chybějí terapeuti nebo přístup k dostupnosti | Otevřete běžný kalendář a počkejte na načtení. Zkontrolujte seznam Terapeuti dostupní pro hledání. |
| Příprava se zastaví nebo zůstane částečná | Zapněte hlášky přípravy, zavřete formulář a postup opakujte z karty správného klienta. Během přípravy neklikejte ani nepište. |
| Služba není správná | Vyberte ji ručně a znovu zkontrolujte délku, datum i čas. |
| Nelze použít již otevřený formulář | Zavřete jej a spusťte přípravu z karty; ID klienta nemusí být ve stávajícím formuláři ověřitelné. |
| Přesčas se nenabízí | Zapněte zahrnutí přesčasů v + → Moduly. Zkontrolujte terapeuta, dostupnost klienta, datum od, rozsah a případnou 40denní lhůtu. |
| Hledání vyžaduje datum poukazu | Vyplňte Vystavení FT poukazu, nebo vypněte První návštěva do 40 dní. |
| Výsledky jsou staré | Spusťte nové hledání. |
| Nastavení vzhledu nemá očekávaný účinek | Vypněte původní styl ve Stylusu a další kopie userscriptu. |

Při hlášení chyby uveďte verzi, postup a přesnou hlášku. Snímky anonymizujte; neposílejte přihlašovací údaje, hlavičky požadavků ani údaje pacientů.

## Verze 1.8.0 stable a ověření

Vydáno 22. 10. 2026. Stabilní desktopové vydání navazuje na uživatelské ověření běžného hledání a přípravy návštěvy a na potvrzený nález termínu v přesčase v živém Fyzionu.

Před vydáním prošly:

- kontrola syntaxe a 160 porovnání výpočtu dostupnosti s nezávislým výpočtem na generovaných datech;
- délky 15/30/45/60 minut, dělené směny, přesčasy, kolize a omezení dostupnosti klienta;
- datum poukazu, prázdné/neplatné datum, hranice 40. dne, přestupný rok a změny času;
- série, doplnění chybějícího termínu, alternativy, pravidla služeb a odmítnutí neúplných odpovědí;
- integrační kontrola rozhraní v Chrome na simulovaných datech: hledání, přepínač přesčasů, uchování nastavení, série, chyba API, odkaz Návod, změna klienta a viditelnost výsledné chyby při vypnutých průběžných zprávách;
- kontrola instalačního webu, aktuálního README a záložní dokumentace bez JavaScriptu.

Označení stable neznamená ověření všech kombinací prohlížečů, pracovišť a služeb. Celý postup skutečného uložení návštěvy nebyl při této závěrečné kontrole automatizován v živém přihlášeném Fyzionu. Dostupnost místností a souběh návštěv klienta u jiných terapeutů nejsou ověřovány.

### Hlavní změny

- Datum vystavení FT poukazu jako jediný základ 40denní lhůty.
- Přesčasy v hledání, sériích, alternativách, náhledu a ověření návštěvy; možnost je vypnout v modulech.
- Odkaz Návod přímo z nabídky +.
- Viditelný konečný výsledek přípravy i při vypnutých průběžných hláškách.
- Vymazání data poukazu a výsledků při změně klienta.
- Popis v panelu odpovídá zapnutí či vypnutí přesčasů.
- Sjednocené číslo verze, README a záložní dokumentace na instalačním webu.
