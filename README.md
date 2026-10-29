# Fyzion+

Doplněk pro [Fyzion](https://app.fyzion.cz/) do desktopového prohlížeče. Hledá volné termíny, navrhuje série návštěv, připravuje formulář návštěvy a upravuje vzhled kalendáře.

**Doporučená verze: stable 1.8.19. Fyzion+ 2 je ve vývoji.**

## Instalace a aktualizace

1. Nainstalujte [Tampermonkey](https://www.tampermonkey.net/).
2. Otevřete [Fyzion+ stable](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js) a potvrďte instalaci nebo aktualizaci.
3. Obnovte otevřené stránky Fyzionu a otevřete kalendář terapeutů.

Pokud se místo instalace zobrazí kód, vložte celý obsah do skriptu v Tampermonkey a uložte. Verzi najdete pod tlačítkem **+**, vedle nadpisu **Nastavení Fyzion+**.

Ponechte zapnutou jen jednu verzi Fyzion+. Starý styl pro Stylus vypněte, pokud přepisuje nastavení vzhledu. Před aktualizací si můžete uložit dosavadní skript a exportovat nastavení přes **+ → Přenos na jiný počítač**.

[Fyzion+ 2 — vývojová verze](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-plus-beta-parallel.user.js) je určená k testování. Tento návod popisuje stable. Obě verze sdílejí místní nastavení; při přepínání vypněte druhou verzi a obnovte všechny stránky Fyzionu. Pro návrat použijte stable nebo uloženou kopii skriptu.

## Novinky

- **1.8.19:** zvýraznění událostí se štítkem KEŠ s vlastní barvou.
- **1.8.18:** události „Pracuje v TS“ blokují nabízené termíny i tehdy, když jsou vedené jako přesčas.
- **1.8.17:** číslo verze je uvnitř nastavení vedle nadpisu.

## Volné termíny

Dlaždici **Volné termíny** najdete v kalendáři. Na kartě klienta použijte **Najít termín**.

1. Vyberte terapeuta nebo **Všichni** a označte osoby, které chcete prohledat.
2. Zvolte délku návštěvy a datum **Hledat od**. Dostupné délky jsou 15, 30, 45 a 60 minut.
3. Případně omezte dny a časy podle dostupnosti klienta.
4. Klikněte na **Najít termíny**.

Rozsah hledání nastavíte v **+ → Výchozí hledání**, od 1 do 180 dní. Kliknutí na nalezený čas otevře kalendář. **Náhled** ukáže pracovní dobu a obsazenost terapeuta. Výsledky starší než dvě minuty vyhledejte znovu.

### Přesčasy a blokace

Volba **+ → Moduly → Zahrnout nepravidelnou pracovní dobu (přesčas)** rozšíří hledání o nepravidelné ordinační hodiny, i ve dnech bez běžné směny. Po vypnutí se hledá jen v pravidelném rozvrhu.

**Oběd** a **Pracuje v TS** vždy blokují svůj interval, i při zapnutých přesčasech a při označení události jako přesčas. Návštěva může končit na začátku blokace nebo začínat na jejím konci. Blokace platí pro příslušného terapeuta a kontrolují se také u sérií, alternativ a před přípravou návštěvy.

### Série návštěv

Zapněte **+ → Moduly → Naplánovat sérii termínů**, nastavte počet návštěv a případně hledání u jednoho terapeuta. Mezi návštěvami zůstává alespoň jeden celý volný den.

**Alternativy** nabídnou jiný čas nebo den. **Přidat termín** doplňuje návštěvy za poslední datum návrhu, v původním rozsahu hledání. Pokud vhodný termín chybí, zvětšete rozsah a spusťte hledání znovu.

Série je návrh. Návštěvy se neukládají hromadně.

### Obnovení zadání

Po obnovení stránky lze použít **Obnovit poslední nastavená data**. Vrátí pole hledání, nikoli staré výsledky. Potom spusťte nové hledání.

Zadání se uchovává v otevřené kartě prohlížeče, zvlášť pro kalendář a jednotlivé klienty. Po zavření karty nemusí být dostupné a není součástí exportu nastavení.

## FT poukazy

### První návštěva do 40 dní

Ve Volných termínech zapněte **První návštěva do 40 dní** a vyplňte **Vystavení FT poukazu**. Poslední povolený den je datum vystavení + 40 kalendářních dní včetně. U série se omezení týká první návštěvy.

Bez platného data se při zapnuté volbě hledání nespustí. Datum se nepředvyplňuje dneškem a při změně klienta se vymaže.

### Počítadlo v nové návštěvě

Pod datem a časem návštěvy je pole **Vystavení FT poukazu** a počet dní do zvolené návštěvy. Den vystavení je den 0, čtyřicátý den je poslední v limitu. Od 41. dne se zobrazí upozornění. Počítadlo návštěvu neukládá ani neblokuje její uložení.

### Počet návštěv a kontrola při přijetí FT

V rozbaleném poukazu v sekci **Výkony** se zobrazuje **Počet návštěv**. Počítají se návštěvy s alespoň jedním zapsaným výkonem daného FT. Více výkonů při jedné návštěvě se počítá jednou; samotný naplánovaný termín se nezapočítá. Při neúplných datech se zobrazí **Nelze ověřit**.

Při přidání nebo úpravě poukazu je pod **Datem vystavení** počet dní od vystavení a poslední den 40denní lhůty. Kontrola porovnává datum s dneškem; neověřuje, zda už první návštěva proběhla. Datum expirace nemění.

Obě funkce lze vypnout v **+ → Moduly**.

## Příprava návštěvy

1. Na kartě klienta klikněte na **Najít termín**.
2. U nalezeného času zvolte **Připravit návštěvu**.
3. Počkejte na dokončení bez klikání a psaní do stránky.
4. Zkontrolujte klienta, službu, terapeuta, místnost, délku, datum a čas. Návštěvu uložte tlačítkem Fyzionu.

Skript doplňuje původní formulář a kontroluje dostupnost před vyplněním i po něm. Návštěvu sám neukládá. U délky 60 minut vyberte službu ručně; ruční výběr může být potřeba také při nejednoznačné nabídce.

Po přerušení mohou ve formuláři zůstat částečně vyplněné údaje. Pokud příprava nemůže použít otevřený formulář, zavřete jej a spusťte ji znovu z karty klienta.

Průběžné zprávy lze vypnout přes **+ → Moduly → Zobrazovat hlášky přípravy návštěvy**. Výsledek a chyba ve stable zůstávají viditelné.

## Závěrečné zprávy

### Čištění textu

Volba **Závěrečná zpráva bez termínů a pozdravu** odstraní rozpoznané přehledy termínů, administrativní výpisy výkonů a závěr od samostatného **S pozdravem**. Klinický text a souhrnný počet návštěv ponechá.

Úprava se provádí přímo v editoru a projeví se při následném uložení i odeslání. Před uložením zprávu zkontrolujte. **Vrátit odstraněné části** obnoví původní text, pokud jste jej mezitím ručně nezměnili, a vypne automatické čištění.

### Úsporný tisk A4

U zprávy zapněte **Úsporný tisk závěrečné zprávy na A4** a použijte **vytisknout**. Velikost písma lze upravit. Delší zpráva pokračuje na dalších stranách; text se neořezává.

Pro úsporné PDF zvolte v tiskovém dialogu **Uložit jako PDF**. Tato tisková úprava nemění původní tlačítko pro uložení PDF do karty pacienta. Po vypnutí se vrátí běžný tisk Fyzionu.

Obě funkce mají přepínače také v **+ → Moduly**.

## Kalendář a vzhled

### Zvýraznění KEŠ

V **+ → Vzhled Fyzionu** zapněte **Barevně odlišit události se štítkem KEŠ** a vyberte **Barvu událostí KEŠ**. Výchozí barva je světle oranžová.

Zvýrazní se události s přiřazeným štítkem **KEŠ**. Pouhá zmínka v názvu události nestačí. Barva se ukládá v prohlížeči a reaguje na změny kalendáře. U šrafované události má barva KEŠ přednost, šrafovací vzor zůstává.

Zvýraznění nemění data událostí ani pravidla hledání termínů.

### Další nastavení vzhledu

V **+ → Vzhled Fyzionu** lze nastavit barvu volna a šrafovaných událostí, časové popisky, skrývání náhledu při najetí, původního tlačítka **+ Návštěva** a nabídky **Stav návštěvy**. Zobrazení lichého či sudého týdne se zapíná v **+ → Moduly**.

### Zobrazit terapeuty

- **Právě pracují:** vybere terapeuty podle aktuálního času v Praze, pracovní doby a probíhajících událostí.
- **Dnes pracují:** přepne kalendář na dnešek a vybere terapeuty s dnešními událostmi, včetně volna a přesčasů.
- **Zobrazit všechny terapeuty:** zobrazí osoby povolené v nastavení.
- **Skrýt všechny terapeuty:** skryje jejich sloupce.

Tyto volby mění zobrazení kalendáře. Výběr terapeutů pro hledání termínů je samostatný.

## Nastavení a přenos

Pod tlačítkem **+** najdete moduly, vzhled, výchozí délku a rozsah hledání i seznam terapeutů dostupných pro hledání.

**Přenos na jiný počítač** umožňuje export a import společného nastavení a návrat panelu na výchozí místo. Export zahrnuje také barvu KEŠ a ID trvale skrytých terapeutů. Neobsahuje údaje pacientů ani celé rozepsané zadání hledání.

Volby tisku a čištění zprávy a doplňkové přepínače FT se ukládají samostatně a nejsou součástí tohoto exportu. Nastavení platí pro profil prohlížeče, není oddělené podle účtu či pracoviště. Vymazáním dat webu se může ztratit.

## Omezení

- Nalezený termín není rezervace. Hledání neověřuje dostupnost místnosti ani kolize klienta u jiných terapeutů.
- Skript používá přihlášení do Fyzionu. Přihlašovací údaje neukládá do nastavení ani exportu a neobsahuje vlastní analytiku.
- Je určený pro desktopový prohlížeč. Změny Fyzionu mohou vyžadovat aktualizaci skriptu.

## Řešení potíží

| Problém | Co zkontrolovat |
| --- | --- |
| Doplněk není vidět | Zapnutý skript a oprávnění Tampermonkey; potom obnovte stránku. |
| Chybějí terapeuti | Otevřete kalendář a zkontrolujte **Terapeuti dostupní pro hledání** v nastavení. |
| Přesčas se nenabízí | Zapnutí přesčasů, vybrané terapeuty, dostupnost klienta a rozsah hledání. |
| „Pracuje v TS“ se nabízí jako volný čas | Verzi stable 1.8.19, název a přiřazení události. Obnovte stránku a spusťte nové hledání. |
| KEŠ nemá vybranou barvu | Zapnutí zvýraznění a přiřazený štítek KEŠ. Vypněte starý styl ve Stylusu nebo další kopie skriptu. |
| Hledání vyžaduje datum poukazu | Vyplňte **Vystavení FT poukazu**, nebo vypněte **První návštěva do 40 dní**. |
| Příprava návštěvy se zastavila | Zavřete formulář a spusťte ji znovu z karty správného klienta. Během přípravy neklikejte ani nepište. |
| Služba se nevybrala správně | Vyberte ji ručně a zkontrolujte délku i čas. |

Při hlášení chyby přiložte verzi, postup a chybovou hlášku. Ze snímků odstraňte údaje pacientů.
