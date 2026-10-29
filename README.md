# Fyzion+

Neoficiální desktopový pomocník pro [Fyzion](https://app.fyzion.cz/). Přidává hledání volných termínů, plánování sérií, přípravu návštěvy z karty klienta a volitelné úpravy vzhledu.

**Verze 1.8.17 stable** · Uživatelský skript pro Tampermonkey · České rozhraní · Desktop stable

> Skript návštěvy automaticky neukládá. Výsledky hledání nejsou rezervace. Před uložením vždy zkontrolujte klienta, službu, terapeuta, místnost, délku a datum s časem.

## Výběr verze: stable 1.8.17 a Fyzion+ 2 Beta

UPOZORNĚNÍ: Verze Fyzion+ 2 Beta nemusí vždy, z důvodu vývoje, odpovídat aktuálnímu README.

| Varianta | Instalace | Název v Tampermonkey |
| --- | --- | --- |
| **1.8.17 stable** | [fyzion-helper.user.js](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js) | Fyzion+ |
| **2.0.0-beta.5** | [fyzion-plus-beta-parallel.user.js](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-plus-beta-parallel.user.js) | Fyzion+ 2.0 Beta |


### Instalace bety, přepínání a návrat

1. Nainstalujte [Tampermonkey](https://www.tampermonkey.net/) do desktopového prohlížeče. Před přechodem exportujte nastavení přes **+ → Přenos na jiný počítač** a uschovejte dosavadní skript.
2. Otevřete instalační odkaz bety z tabulky. Pokud se zobrazí jen kód, vytvořte v Tampermonkey nový skript, vložte celý obsah `fyzion-plus-beta-parallel.user.js` a uložte jej.
3. Beta má odlišný název a namespace (`local.fyzion.helpers.beta`), proto může být nainstalovaná vedle stable (`local.fyzion.helpers`). **Zapněte vždy jen jednu variantu.** Zkontrolujte i případné starší ručně instalované kopie Fyzion+.
4. Po instalaci, aktualizaci i každém přepnutí obnovte **všechny otevřené stránky Fyzionu**. Vypnutí skriptu v Tampermonkey neodstraní jeho již spuštěný kód z otevřené stránky.
5. Přihlaste se do Fyzionu a otevřete kalendář terapeutů, aby se načetli terapeuti a přístup k dostupnosti. Původní styl ve Stylusu vypněte, pokud přepisuje vzhled userscriptu.

Pro návrat vypněte betu, zapněte nebo znovu nainstalujte stable z tabulky a obnovte všechny stránky Fyzionu. Pokud je třeba, importujte zálohu nastavení odpovídající cílové verzi. Starší beta instalovaná jako běžný **Fyzion+** může být přepsána instalací stable; pro uchování obou variant použijte samostatný beta soubor výše.

**Obě varianty sdílejí místní nastavení webu**, výběr a skrytí terapeutů i pomocné úložiště zadání; nejde o oddělené testovací prostředí. Změny nastavení bety se mohou projevit po návratu do stable. Export nenahrazuje zálohu skriptu, neobsahuje celé zadání hledání a kompatibilita novějšího exportu se starší verzí není zaručená. Nastavení není oddělené podle účtu či pracoviště.

### Co publikovaná beta obsahuje

Zachovává základní hledání volných termínů, přesčasy, blokace včetně oběda, dostupnost klienta, 40denní limit od data vystavení FT, návrhy sérií, alternativy, náhled, obnovu posledního zadání, přípravu návštěvy bez uložení a volitelné úpravy vzhledu. Platí délky 15/30/45/60 minut, rozsah 1–180 dní a časové pásmo Europe/Prague. Funkce jsou popsány v návodu níže; odlišnosti bety shrnuje tato tabulka.

| Oblast | Chování v 2.0.0-beta.5 a rozdíl vůči stable 1.8.17 |
| --- | --- |
| Příprava návštěvy | Omezuje opakovaná čekání na již připravený formulář a zbytečné změny správně vybraných polí. Nezávislá čtení rozvrhu a událostí probíhají souběžně. Čerstvá kontrola dostupnosti zůstává před vyplněním i po něm; datum, čas a délka musí na konci zůstat správné tři sekundy. |
| Přidat termín do série | Nabízí všechny vhodné dny v nastaveném rozsahu, bez dřívějšího omezení na prvních 12 časů. První den je rozbalený, časy dalších dnů se vytvoří po rozbalení. Doplňuje pouze za poslední datum série a zachovává alespoň jeden celý volný den mezi návštěvami i ostatní omezení zadání. |
| Hlášky přípravy | Vypnutí **Zobrazovat hlášky přípravy návštěvy** potlačí průběžné, závěrečné i chybové okno a text přípravy v panelu. To se liší od původního popisu, podle kterého konečný výsledek a chyba zůstávají viditelné. Volbu lze změnit během přípravy, synchronizuje se mezi kartami stejného profilu. Po opětovném zapnutí lze zobrazit poslední dosud nezavřené hlášení. |
| Terapeuti a moduly | Skupina **Terapeuti** je na konci Modulů. Volba **Zjemnit tlačítko Zobrazit terapeuty mimo najetí myší** ponechává na desktopu tlačítko při 60% krytí; myš, zaměření klávesnicí či otevřená nabídka jej zvýrazní. Na dotykovém zařízení je plně viditelné. Stable ve svém starším návodu popisuje úplné skrytí do najetí. |
| FT a kalendář | Počítadlo dní od vystavení FT v nové návštěvě je pod řádkem data a času; má samostatný přepínač stejně jako lichý/sudý týden. Tyto funkce má také stable, nejsou výhradní novinkou bety. Počítadlo nenahrazuje samostatně zapínaný 40denní filtr hledání. |
| Časové limity | Hledání, alternativy a doplnění série 180 s, náhled 60 s, příprava 120 s. Stejné hlavní limity má aktuální stable. Údaje 90/30/60 s ve starší části návodu jsou historické. Čerstvost výsledků zůstává dvě minuty; delší limit není prodloužením jejich platnosti ani povinným čekáním. |
| Funkce novější stable | Beta.5 neobsahuje pozdější úsporný tisk a čištění závěrečné zprávy z řady 1.8.12–1.8.16, počet návštěv u FT ani kontrolu lhůty při příjmu FT z 1.8.13 a zobrazení verze uvnitř nastavení z 1.8.17. Příslušné kapitoly níže popisují stable. |

### Omezení bety a postup při potížích

- **Návštěvu ukládá uživatel původním tlačítkem Fyzionu.** Beta nezajišťuje hromadné uložení série ani přehled skutečně uložených návštěv série. Připravený formulář či návrh není rezervace.
- Komplexní kontroly kolizí klienta u jiných terapeutů a dostupnosti místností nejsou zapojené do běžného hledání. Zdroj obsahuje dílčí pomocné funkce a podmíněné kontroly, ale běžné výsledky jim nepředávají potřebný kontext klienta/místnosti. Nelze je považovat za hotovou ochranu před těmito kolizemi.
- Před uložením ověřte klienta, službu, terapeuta, místnost, délku, datum i čas. Pro 60 minut chybí automatické mapování služby; při nejednoznačné službě je nutný ruční výběr. Po přerušení mohou zůstat částečně doplněná pole.
- Při vypnutých hláškách není absence chyby potvrzením úspěchu. Pro zjištění výsledku hlášky znovu zapněte. Během přípravy nezasahujte do formuláře; přepnutí hlášek je podporovaná výjimka.
- Beta běží v přihlášené stránce Fyzionu a závisí na jeho rozhraní a API. Mobilní provoz ani všechny kombinace prohlížečů a pracovišť nejsou ověřené; test rozložení nebo dotykového ovládání tuto podporu nedokládá.


## Změny 1.8.17 — verze v okně nastavení

Číslo verze se zobrazuje uvnitř otevřeného okna vedle nadpisu Nastavení Fyzion+. Růžová dlaždice zobrazuje pouze symbol +.

## Změny 1.8.16 — čištění závěrečné zprávy

Čištění závěrečné zprávy nově odstraní také samostatné administrativní řádky začínající **Výkony:**, které už nemají před sebou datum. Odstraní i žadatele v závorce, kódy výkonů, násobky, časy a diagnostické kódy v tomto výpisu.

Rozpoznání funguje v odstavci, vnořených značkách, tabulce a při rozdělení kódů přes více řádků. Souhrnný počet návštěv a klinické věty zůstávají zachované. Samotná klinická věta začínající Výkony bez administrativních kódů se automaticky nemaže. Dosavadní odstranění dat návštěv a celého závěru od S pozdravem zůstává zachované.

Úprava se promítá přímo do editoru a modelu předaného původnímu tlačítku Uložit. Skript sám nic neukládá. Před uložením obsah zkontrolujte. Vrácení odstraněných částí a přepínač čištění v Modulech zůstávají dostupné.

Po aktualizaci obnovte Fyzion a otevřete zprávu znovu. Dlaždice + musí zobrazovat **1.8.16**. Při testu byly odstraněny výpisy včetně zalomených pokračování a zachovány klinické věty, počet návštěv i funkce vrácení původního textu. Test používal modelová data.

## Změny 1.8.15 — konkrétní formát termínů, celý podpisový závěr a číslo verze

- Čištění zprávy rozpoznává i řádky s českým datem slovně a následným výpisem výkonů, například **6. května 2025 Výkony: …**, a samostatné termíny typu **1. září 2026**. Odstraňuje tyto administrativní řádky přímo v editoru, včetně formátování po odstavcích, zalomeních řádků a v tabulkách.
- Souhrnný **Počet návštěv** se ponechává. Klinický text, včetně dat popisujících vyšetření a nález, se zachovává.
- Od samostatné řádky **S pozdravem** se odstraní vše do konce zprávy: podpis, pracoviště, kontakty i další text pod pozdravem. Funguje i přes více odstavců a vnořených bloků. Podporován je také překlep **S poydravem**.
- Úprava se propisuje do modelu editoru, takže ji dostanou i původní tlačítka Uložit a Odeslat. Skript sám zprávu neukládá ani neodesílá. Zachována je možnost vrácení odstraněných částí, pokud jste mezitím text ručně nezměnili.
- Dlaždice **+** má pod symbolem viditelnou verzi **1.8.15**. Verze je také v popisku tlačítka; kliknutí dál otevírá nastavení.

Po aktualizaci obnovte Fyzion a otevřete zprávu znovu. V Modulech musí být zapnutá volba **Závěrečná zpráva bez termínů a pozdravu**. Před uložením zkontrolujte upravený obsah.

Ověřeno na modelu skutečně poskytnutého formátu bez osobních údajů: české názvy měsíců, výpisy výkonů, samostatná data, zalomení BR, prostý text, vnořené bloky podpisu, klinická data, přenos do ukládaného modelu, tisk a viditelný údaj o verzi. Kontrolní PDF mělo jednu A4 a neobsahovalo odstraněný přehled ani celý podpisový závěr; bylo vizuálně zkontrolované.

## Změny 1.8.14 — čištění zprávy přímo v editoru

Dosavadní vynechání termínů se týkalo tiskové kopie. Nově se rozpoznaný přehled termínů návštěv a samostatný blok začínající **S pozdravem** odstraňují přímo v editoru vygenerované závěrečné zprávy. Úprava tak platí i pro následné **uložení PDF do karty** a **odeslání pacientovi**.

- Upravuje se obsah rozpoznaného editoru závěrečné zprávy a jeho běžný vstupní model. Skript sám nic neukládá ani neodesílá; to dál provádí uživatel původními tlačítky Fyzionu.
- Nález, průběh terapie a data obsažená v klinickém textu se zachovávají. Odstraňují se samostatné rozpoznané přehledy, nikoli libovolné zmínky o datu. Rozpoznání zahrnuje i výčty termínů bez roku.
- Přímo u zprávy je volba **Odstranit termíny návštěv a „S pozdravem“**. Stejnou funkci lze vypnout v **+ → Moduly → Závěrečná zpráva bez termínů a pozdravu**. Výchozí stav je zapnuto.
- Tlačítko **Vrátit odstraněné části** obnoví předchozí podobu, pokud jste mezitím text ručně neupravili, a vypne automatické čištění. Pozdější ruční změny automaticky nepřepisuje. Původní podoba zůstává pouze v paměti otevřené zprávy.
- Volba úsporného tisku a velikost písma zůstávají samostatné. Nastavení se uchovává v tomto prohlížeči; není součástí staršího exportu nastavení.

Po aktualizaci obnovte Fyzion a otevřete závěrečnou zprávu znovu. Před uložením zkontrolujte upravený obsah.

Ověřeno na modelových datech: změna obsahu přímo v editoru, předání upraveného textu modelu před uložením a odesláním, zachování klinických dat, vrácení původního HTML, ochrana ručních změn a zapamatování vypnuté volby. Kontrolní vícestránkové PDF neobsahovalo přehled termínů ani pozdrav a identifikační hlavička byla jen jednou. PDF bylo vizuálně zkontrolované; živá zpráva pacienta nebyla použita.

## Změny 1.8.13 — FT poukazy a závěrečná zpráva

### Počet návštěv u FT poukazu

V rozbaleném poukazu v sekci **Výkony** je pod Počtem výkonů také **Počet návštěv**. Počítají se jedinečné návštěvy, u kterých je zapsán alespoň jeden výkon tohoto FT. Více výkonů při jedné návštěvě se počítá jednou. Samotné naplánování termínu bez přiřazeného výkonu se nezapočítává.

Data přebírá ze seznamu poukazů načteného Fyzionem; nezadává kvůli tomu další požadavky. Pokud jste skript aktualizovali v otevřené stránce, obnovte Fyzion a otevřete Výkony znovu. Při neúplných datech nebo nejednoznačné shodě poukazů zobrazí **Nelze ověřit** místo odhadovaného počtu. Datum poukazu se vyhodnocuje v časovém pásmu Europe/Prague. Údaje se neukládají do místního úložiště a při změně klienta se zahazují.

### Kontrola 40 dní při příjmu poukazu

Pod **Datem vystavení** v přidání či úpravě FT poukazu je počet dní od vystavení a poslední den 40denní lhůty pro první návštěvu. Počítá kalendářní dny od zadaného data; den vystavení je den 0 a 40. den je poslední v limitu.

Při překročení, neplatném nebo budoucím datu zobrazí upozornění; při prázdném datu vyzve k jeho zadání. Jde o kontrolu vůči dnešku, nikoli o ověření, zda už první návštěva někdy proběhla. Uložení neblokuje a **Datum expirace** nemění.

Obě nové funkce mají samostatné přepínače v **+ → Moduly**: **Počet návštěv u FT poukazu** a **Lhůta 40 dní při přijetí FT poukazu**. Jejich volby se ukládají samostatně v prohlížeči a nejsou součástí dosavadního exportu nastavení.

### Úsporný tisk bez termínů a opakovaných hlaviček

V tiskové kopii závěrečné zprávy se vynechá rozpoznaný samostatný přehled termínů návštěv: tabulka s termíny, seznam dat pod příslušným nadpisem nebo řádek Termíny návštěv s výčtem dat. Klinický text a data uvnitř nálezu či průběhu léčby zůstávají zachované. Neznámou nebo smíšenou strukturu skript automaticky nemaže.

Hlavičky pacient/pracoviště v tabulkách se neopakují na dalších stranách. Opakované shodné bloky tiskové hlavičky se ponechají jen jednou. Úprava platí při zapnutém úsporném tisku a týká se pouze tiskové kopie. Uložený text, odeslání pacientovi a původní ukládání do karty se nemění.

Ověření na modelových datech: jedinečné návštěvy, dva různé poukazy, nejednoznačné přiřazení, prázdná data, přenos UTC data do Prahy, fetch i XMLHttpRequest, přechod mezi klienty, přepínače po obnovení stránky a 40./41. den. V třístránkovém PDF se identifikační hlavička objevila právě jednou, přehled termínů chyběl a klinické údaje i poslední řádek zůstaly zachované. Tisk byl vizuálně zkontrolovaný. Do živého účtu se při testech nezapisovalo.

## Změny 1.8.12 — úsporný tisk závěrečné zprávy

Přímo u vygenerované závěrečné zprávy o léčbě je nová volba **Úsporný tisk závěrečné zprávy na A4**. Po aktualizaci skriptu obnovte Fyzion, otevřete závěrečnou zprávu a použijte její tlačítko **vytisknout**.

- Výchozí písmo je 10,5 bodu, menší mezery a okraje 12 mm. Velikost lze změnit přímo u zprávy.
- Tisková kopie se pokusí vejít na jednu A4 automatickým zmenšením nejvýše do minima 9 bodů. Pokud je obsah příliš dlouhý, pokračuje na více stranách; text se neořezává.
- Zpráva se otevře v novém tiskovém okně. Běžně dlouhá zpráva rovnou vyvolá tiskový dialog; u příliš dlouhé zprávy lze tisk spustit tlačítkem v náhledu.
- Volbu lze vypnout také přes **+ → Moduly → Úsporný tisk závěrečné zprávy (A4)**. Vypnutí vrátí původní tisk Fyzionu.
- Tisková volba a velikost písma se pamatují samostatně v tomto prohlížeči; nejsou součástí dosavadního exportu nastavení.
- Uložený text, tlačítko **uložit** pro PDF v kartě pacienta a odesílání pacientovi se nemění. Pro úsporné PDF použijte **vytisknout → Uložit jako PDF** v tiskovém dialogu.
- Úprava je omezena na rozpoznaný editor vygenerované závěrečné zprávy. Nemění účtenky, rozpisy návštěv ani tisk jednotlivé návštěvy. U nepodporované vložené grafiky vyzve k použití původního tisku.

Ověření na modelových datech: zpráva se vytiskla na 1 A4, záměrně dlouhá zpráva na 4 stránky a obsah včetně posledního řádku zůstal zachovaný. Ověřeno zapnutí/vypnutí, původní tisk ostatních dokumentů, nezměněný editor a ukládání. PDF byly vizuálně zkontrolované. Živá zpráva pacienta nebyla při testování použita.

## Změny 1.8.11 — rozložení a ovládání modulů

- Počítadlo FT poukazu je pod celým řádkem data a času; neubírá místo původním polím. Ověřeno při šířkách 320, 375, 768 a 1280 bodů.
- Tlačítko **Zobrazit terapeuty** se na počítači plynule objeví po najetí myší na jeho místo pod výběrem terapeutů. Při otevřené nabídce a při zaměření klávesnicí zůstává viditelné. Na dotykovém zařízení je stále viditelné.
- V **+ → Moduly** jsou samostatné přepínače **Počítadlo dní od vystavení FT poukazu v nové návštěvě**, **Skrývat tlačítko Zobrazit terapeuty do najetí myší** a **Lichý / sudý týden u data v kalendáři**. Výchozí stav všech tří je zapnuto.
- Vypnutí skrývání ponechá tlačítko terapeutů stále viditelné. Celé zobrazení terapeutů má i nadále vlastní přepínač.
- Vypnutí počítadla skryje pouze pomocný blok v nové návštěvě. Volba **První návštěva do 40 dní** ve Volných termínech má dál samostatné ovládání.
- Volby se ukládají v tomto prohlížeči, přežijí obnovení stránky a jsou součástí exportu/importu nastavení. Starší nastavení nová pole doplní automaticky.

Ověření: 17 místních testovacích sad včetně rozložení, myši, klávesnice, dotyku a obnovení nastavení po refreshi. Testy používají modelová data; nenahrazují kontrolu na živém účtu. Tato opravná verze zachovává funkce řady 1.8; verze 2.0 se připravuje samostatně.

## Instalace

1. Nainstalujte [Tampermonkey](https://www.tampermonkey.net/) do svého desktopového prohlížeče.
2. Otevřete [instalační odkaz Fyzion+](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js) a potvrďte instalaci.
3. Pokud se zobrazí pouze zdrojový kód, vytvořte nový skript v Tampermonkey, nahraďte jeho obsah celým souborem `fyzion-helper.user.js` a uložte.
4. Přihlaste se do Fyzionu a obnovte stránku.
5. Otevřete kalendář terapeutů, aby se načetl jejich seznam a přihlášený přístup k dostupnosti.

Průvodce instalací: [Fyzion+ na GitHub Pages](https://bruhaedwin.github.io/Fyzion_upravy/).

Ponechte aktivní pouze jednu kopii skriptu. Pokud prohlížeč vyžaduje zvláštní povolení uživatelských skriptů, povolte je podle pokynů Tampermonkey.

### Aktualizace 

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

### Přidání termínu do série

Tlačítko **Přidat termín** nabízí návštěvy pouze po posledním datu aktuálního návrhu série. Nevyplňuje mezery mezi zbývajícími návštěvami. Zachovává dostupnost klienta, výběr terapeuta, nastavení přesčasů a alespoň jeden celý volný den mezi návštěvami. Po přidání se návštěvy seřadí podle data a přečíslují.

Doplnění používá původní rozsah hledání. Pokud za poslední návštěvou není vhodný termín, zvětšete rozsah a spusťte nové hledání. U prázdného návrhu platí pro první přidávaný termín i případný limit od vystavení FT poukazu.

### Obnovení zadání po refreshi

Tlačítko **Obnovit poslední nastavená data** načte poslední platné zadání ve Volných termínech: terapeuta a výběr osob, délku, datum Hledat od, rozsah, dostupnost klienta, datum vystavení poukazu a přepínač 40 dní, počet a režim série a zahrnutí přesčasů. Zadání se průběžně uchovává při změnách polí. Rozepsané neplatné hodnoty nepřepíšou poslední platné zadání.

Zadání zůstává dostupné po refreshi v téže kartě prohlížeče. Uchovává se v dočasném úložišti karty (sessionStorage), odděleně pro kalendář a jednotlivé klienty, bez jmen klientů. Není součástí exportu. Po zavření karty nemusí být dostupné. Pokud úložiště prohlížeč nepovolí nebo nebylo zadání dosud nastaveno, obnova nemusí být dostupná.

Tlačítko obnoví pouze pole formuláře; nemění datum zobrazeného kalendáře ani neobnovuje staré výsledky. Potom klikněte na **Najít termíny** pro aktuální dostupnost. Nedostupného nebo zakázaného terapeuta nelze automaticky obnovit.

### První návštěva do 40 dní

Zapněte **První návštěva do 40 dní** a vyplňte **Vystavení FT poukazu**. Lhůta vychází výhradně z tohoto data, nikoli z dneška ani z data „Hledat od“. Poslední povolený den první návštěvy je datum vystavení + 40 kalendářních dní včetně. Například poukaz vystavený 1. 10. 2026 umožní první návštěvu nejpozději 10. 11. 2026. Rozsah hledání se tím automaticky nemění.

V sérii se limit týká první návštěvy; další mohou následovat později v rozsahu hledání. Prázdné nebo neplatné datum při zapnutém limitu hledání zastaví a zobrazí vysvětlení. Při vypnutém limitu se datum nepoužívá. Změna data vymaže výsledky, proto spusťte nové hledání.

Datum poukazu se nepředvyplňuje dneškem a neukládá se do nastavení ani exportu. Při otevření hledání pro jiného klienta se vymaže.

### Nepravidelná pracovní doba (přesčas)

V **+ → Moduly → Zahrnout nepravidelnou pracovní dobu (přesčas)** je ve výchozím stavu zapnutá podpora nepravidelných ordinačních hodin Fyzionu. Ty rozšiřují běžný rozvrh i na dny bez pravidelné směny. Překrývající se pracovní úseky se sloučí. Návštěvy, volno, přestávky a ostatní blokace se nadále odečítají.

Vypnutí přepínače omezí hledání, série, alternativy, náhled a závěrečné ověření před přípravou návštěvy na pravidelný rozvrh. Změna vymaže dosavadní výsledky. Volba se ukládá a přenáší exportem/importem nastavení.

## Počítadlo lhůty ve formuláři návštěvy

Pod skupinou Datum a čas v původním formuláři Fyzionu je pole **Vystavení FT poukazu** a počítadlo kalendářních dní od jeho vystavení do zvoleného data návštěvy. Přepočítává se i při ruční změně data.

- V den vystavení ukazuje 0 dní; 40. den označí jako poslední den lhůty.
- Od 41. dne zobrazí červené upozornění s počtem dní překročení.
- U návštěvy před vystavením poukazu nebo při neplatném datu zobrazí upozornění. Při chybějícím datu vyzve k jeho doplnění.
- Datum přebírá ze zadání Fyzion+ nebo z návrhu uchovaného v této kartě pouze při odpovídajícím klientovi. Jinak ho lze zadat přímo v počítadle. Při změně klienta se datum vymaže, aby se nepoužilo u jiné osoby.
- U ověřeného klienta se ruční změna data vystavení promítne také do zadání Volných termínů a jeho obnovitelného návrhu.

Jde o průběžné upozornění pro kontrolu **první návštěvy**, nikoli plošný zákaz ukládání návštěv. Další návštěvy série mohou být za 40denní hranicí. Počítadlo nemění datum ani čas návštěvy a návštěvu neukládá.

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

Celkový limit přípravy je 120 sekund. Hledání má limit 180 sekund a načtení náhledu 60 sekund. Po chybě či zrušení mohou ve formuláři zůstat částečně doplněné údaje.

### Hlášky přípravy

V **+ → Moduly → Zobrazovat hlášky přípravy návštěvy** lze vypnout průběžné zprávy. Volba se ukládá. Konečný výsledek, chyba a upozornění na ruční kontrolu služby zůstávají viditelné i při vypnutých průběžných zprávách. Hlášení zavřete tlačítkem **Zavřít hlášení**.

## Zobrazit terapeuty

Nenápadné tlačítko v kalendáři otevírá nabídku se čtyřmi akcemi. Po zvolení akce se nabídka zavře.

- **Právě pracují:** zahrne terapeuty v aktuální pravidelné či nepravidelné pracovní době bez právě probíhajícího volna a také terapeuty s právě probíhající návštěvou či jinou běžnou událostí mimo rozvrh. Samotné volno a přestávka se za práci nepočítají; nepravidelné ordinační hodiny jsou pracovní dobou i při zobrazení jako pozadí. Probíhající běžná událost má při souběhu přednost před volnem.
- **Dnes pracují:** přepne kalendář na dnešní datum a vybere povolené terapeuty, kteří mají během dneška jakoukoli událost — minulou, probíhající nebo budoucí. Zahrnuje i události přesahující půlnoc, přesčasy a volno. Samotný pravidelný rozvrh bez událostí nestačí. Pokud dnes nemá nikdo události, sloupce se skryjí. Den se posuzuje v časovém pásmu Europe/Prague.
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

V místním úložišti webu se uchovává nastavení, poloha panelu, povolení/skrytí terapeutů, výběr pro hledání a pomocný seznam ID a jmen terapeutů až na sedm dní. Dostupnost klienta se po obnovení stránky automaticky nepředvyplní; poslední zadání lze načíst tlačítkem Obnovit poslední nastavená data v téže kartě. Obsazenost se pro hledání načítá znovu.

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

## Verze 1.8.11 stable a ověření

Vydáno 26. 10. 2026. Stabilní desktopové vydání navazuje na uživatelské ověření běžného hledání a přípravy návštěvy a na potvrzený nález termínu v přesčase v živém Fyzionu.


Označení stable neznamená ověření všech kombinací prohlížečů, pracovišť a služeb. Celý postup skutečného uložení návštěvy nebyl při této závěrečné kontrole automatizován v živém přihlášeném Fyzionu. Dostupnost místností a souběh návštěv klienta u jiných terapeutů nejsou ověřovány.

### Změna 1.8.11 — počítadlo FT poukazu

Počet kalendářních dní od vystavení FT poukazu přímo pod datem/časem návštěvy. Červené upozornění při překročení 40 dní, kontrola chybějících/neplatných dat a oddělení klientů. Prošlo 14 testovacích sad včetně testu nativního formuláře, změn dat a hranice 40./41. dne.

### Změna 1.8.9 — rychlost a delší čekání

Rychlejší přiřazování událostí terapeutům, průchod blokacemi a převody časů. Části období se načítají až třemi požadavky současně. V syntetickém měření na 12 terapeutech a 90 dnech byl místní výpočet přibližně 8.0× rychlejší při shodných výsledcích. Celková rychlost živého hledání závisí také na API.

Limity: hledání/alternativy/doplnění 180 s, náhled 60 s, příprava návštěvy 120 s, ustálení formuláře 30 s. Kontrola čerstvosti zůstává dvě minuty; příliš stará data mohou být odmítnuta dříve. [Podrobnosti, měření a limity](VYKON-1.8.9.md).

### Změna 1.8.8 — audit a opravy

Audit potvrdil a opravil tři hraniční chyby: odmítání návštěvy končící přesně o půlnoci při neomezeném konci dostupnosti klienta, automatické převádění neexistujícího data z API na jiný den a neobnovení levého spodního rohu při importu výchozí polohy.

Prošlo všech 12 testovacích sad včetně nových regresních testů. Podrobnosti a rozsah ověření: [Audit 1.8.7 → 1.8.8](AUDIT-1.8.8.md). Závěrečná kontrola nevytvářela ani neukládala návštěvy v živém Fyzionu.

### Změna 1.8.7

Událost obsahující v názvu slovo Oběd nebo obed (bez rozlišení velkých písmen) blokuje nabízené časy také v případě, že je označená jako přesčas. Platí pro běžné hledání, série, alternativy, přidávání termínu i kontrolu před přípravou návštěvy. Návštěva smí končit přesně na začátku oběda nebo začínat přesně na jeho konci, ale nesmí se překrývat.

V kontrolním náhledu se oběd zobrazí oranžovým blokem s označením Oběd a časem od–do. Uchovává se pouze příznak oběda, ne původní název události ani údaje pacientů.

### Změna 1.8.6

Označení Lichý/Sudý týden je přímo vedle denního data (např. po 26. 10.) nad sloupci terapeutů. U názvu měsíce se nezobrazuje. Popisek se aktualizuje při změně data a při překreslení kalendáře.

### Změna 1.8.5

Nové tlačítko Obnovit poslední nastavená data ve Volných termínech. Ověřena obnova po refreshi, oddělení klientů, neplatné uložené údaje a zachování prázdných výsledků bez automatického hledání.

### Změna 1.8.4

Vedle data v horním záhlaví kalendáře se zobrazuje Lichý týden nebo Sudý týden a číslo týdne podle ISO (pondělí až neděle). Označení sleduje zobrazená data kalendáře. Při zobrazení více týdnů uvede obě označení. Nalezené termíny se nemění.

### Změna 1.8.3

Dlaždice Volné termíny je opět ukotvená 20 px od levého a spodního okraje. Panel se otevírá nad ní a po zavření se dlaždice neposune. Aktualizace jednorázově obnoví původní polohu; následné ruční přesuny se dál ukládají. Ruční návrat: + → Přenos na jiný počítač → Vrátit polohu panelu.

### Změna 1.8.2

Nová volba **Dnes pracují** vybírá terapeuty podle všech dnešních událostí a přesune kalendář na dnešní datum. Ověřeno testy hranic dne, změny času a integračním testem přepnutí kalendáře a filtru, včetně dne bez událostí.

### Změna 1.8.1

Přidat termín doplňuje návštěvy výhradně na konec série. Ověřeno jednotkovými i integračními testy, včetně odebrání prostřední návštěvy a správného přečíslování po doplnění.

### Hlavní změny

- Datum vystavení FT poukazu jako jediný základ 40denní lhůty.
- Přesčasy v hledání, sériích, alternativách, náhledu a ověření návštěvy; možnost je vypnout v modulech.
- Odkaz Návod přímo z nabídky +.
- Viditelný konečný výsledek přípravy i při vypnutých průběžných hláškách.
- Vymazání data poukazu a výsledků při změně klienta.
- Popis v panelu odpovídá zapnutí či vypnutí přesčasů.
