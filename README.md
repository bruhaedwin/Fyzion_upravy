# Fyzion+

Neoficiální pomocník pro práci s [Fyzionem](https://app.fyzion.cz/). Spojuje úpravy vzhledu, hledání volných termínů, návrhy sérií návštěv a přípravu objednávky přímo z karty klienta.

**Aktuální verze: 1.7.30** · Uživatelský skript pro Tampermonkey · České rozhraní

> Fyzion+ není oficiální součást Fyzionu. Návrh termínu ani předvyplnění formuláře nevytváří rezervaci. Každou návštěvu před uložením zkontrolujte a potvrďte ve Fyzionu.


## První instalace nebo aktualizace

Možnost použít průvodce instalací Fyzion+:  https://bruhaedwin.github.io/Fyzion_upravy/

1. Nainstalujte rozšíření [Tampermonkey](https://www.tampermonkey.net/) pro svůj prohlížeč.
2. Otevřete [instalační odkaz skriptu](https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js) a potvrďte instalaci v Tampermonkey.
3. Pokud se místo instalace zobrazí zdrojový kód, zkopírujte jej do nového skriptu v editoru Tampermonkey a uložte pomocí **Ctrl + S**.
4. Přihlaste se do `https://app.fyzion.cz/` a obnovte stránku.
5. Při prvním použití otevřete kalendář terapeutů, aby se načetl jejich seznam a přihlášený přístup k datům.

V Tampermonkey ponechte aktivní pouze jednu kopii Fyzion+. Pokud prohlížeč blokuje uživatelské skripty, postupujte podle pokynů rozšíření pro jejich povolení.

### Aktualizace

Znovu otevřete instalační odkaz a potvrďte aktualizaci, případně nahraďte celý obsah stávajícího skriptu v editoru Tampermonkey. Uložte a obnovte Fyzion. Aktuální verze je uvedená také v záhlaví panelu **Volné termíny**.

Nastavení uložené ve stejném profilu prohlížeče a pro stejnou adresu Fyzionu běžnou výměnu kódu přežije. Před přesunem na jiný počítač použijte export nastavení.

## Co Fyzion+ umí

| Funkce | Popis |
| --- | --- |
| Volné termíny | Hledání podle délky, období a vybraných terapeutů. |
| Dostupnost klienta | Omezení podle dnů v týdnu a nejdřívějšího / nejpozdějšího času. |
| Návrhy sérií | Kompletní i neúplné návrhy více návštěv, volitelně u stejného terapeuta. |
| Alternativy | Hledání jiného času nebo dne a úprava návrhu série. |
| Kontrolní náhled | Obsazenost vybraného terapeuta v daný den a zvýrazněný navržený termín. |
| Objednání z karty | Tlačítko **Najít termín** nad původním tlačítkem pro novou návštěvu. |
| Příprava návštěvy | Otevření formuláře a doplnění služby, terapeuta, délky, data a času. |
| Zapamatování terapeutů | Uchování výběru i seznamu terapeutů po obnovení stránky. |
| Zobrazení terapeutů | Pomocné volby **Právě pracují**, **Zobrazit všechny terapeuty** a **Skrýt všechny terapeuty** v kalendáři. |
| Vzhled | Nastavitelný kontrast nepracovní doby, popisky časů, zvýraznění šrafovaných událostí a další přepínače. |
| Nastavení | Společné menu pod tlačítkem **+**, zapínání modulů a export/import nastavení. |

## Hledání volných termínů

1. Otevřete **Volné termíny** nebo **Najít termín** na kartě klienta.
2. Vyberte terapeuta. Pro více terapeutů zvolte **Všichni** a zaškrtněte požadované osoby v seznamu.
3. Nastavte délku návštěvy, datum začátku hledání a rozsah období.
4. Případně upravte **Možnosti pacienta**: dny v týdnu a časové rozmezí.
5. Spusťte hledání a rozbalte den s nabízenými časy.

Datum, čas a terapeut jsou v každém výsledku oddělené od akčních tlačítek. Kliknutí na samotný termín slouží k přechodu do kalendáře; pro předvyplnění použijte **Připravit návštěvu**.

- **Náhled** načte obsazenost vybraného terapeuta a zvýrazní navrženou návštěvu.
- **Najít alternativu** nabídne jiný čas nebo jiný den.
- Výsledky nejsou rezervované. Při změně kalendáře nebo po zestárnutí výsledků spusťte nové hledání.

Rozsah hledání lze nastavit od 1 do 180 kalendářních dní. Časy se vyhodnocují v pásmu **Europe/Prague**.

## Objednání přímo z karty klienta

1. Otevřete kartu požadovaného klienta.
2. Nad modrým tlačítkem **+ Návštěva / Nová návštěva** klikněte na **Najít termín**.
3. Vyhledejte termín a klikněte na **Připravit návštěvu**.
4. Skript klikne na původní tlačítko nové návštěvy a počká, až Fyzion předvyplní klienta.
5. Vybere službu a terapeuta, nastaví délku a nakonec datum a čas.
6. Počkejte na dokončení stavu **Připravuji…**. Ověření hodnot trvá několik sekund.
7. Zkontrolujte klienta, službu, terapeuta, místnost, délku a datum s časem. Potom návštěvu uložte běžným tlačítkem Fyzionu.

Klienta předvyplňuje Fyzion ze své karty; skript toto pole nemění. Místnost zůstává na hodnotě, kterou nabídne Fyzion, a vyžaduje kontrolu. Pokud už je formulář otevřený, příprava využije jeho existující pole.

### Automatický výběr služby

| Délka návrhu | Název služby | Rozlišení v nabídce |
| --- | --- | --- |
| 15 minut | Terapie | Délka 15 minut v doplňujícím textu položky. |
| 30 minut | Terapie | Délka 30 minut v doplňujícím textu položky. |
| 45 minut | komplexní terapie 45min | Odpovídající název a délka 45 minut. |
| 60 minut | Ruční výběr | Automatické mapování není nastavené. |

Stejnojmenné položky **Terapie** se rozlišují podle textu s délkou v pravé části nabídky. Při nenalezené nebo nejednoznačné službě skript pokračuje v doplnění ostatních údajů a zobrazí upozornění. Službu pak vyberte ručně a znovu zkontrolujte čas i délku.

Služba a délka mohou ve Fyzionu přepsat čas návštěvy. Proto se čas doplňuje až nakonec a skript ověřuje jeho stabilitu. Opožděný přepis se pokusí opravit automaticky; při opakovaném přepisování oznámí chybu. Ruční změna pole během přípravy operaci přeruší.

## Plánování série

V **+ → Moduly** zapněte **Naplánovat sérii termínů**. Nastavte počet návštěv a případně požadavek na jednoho terapeuta.

- Návrhy dodržují zadanou dostupnost klienta a mezi návštěvami ponechávají alespoň jeden celý volný den.
- Lze nabídnout alternativu, odebrat návštěvu z návrhu nebo doplnit chybějící termín.
- Neúplné návrhy jsou označené počtem nalezených návštěv.
- Volitelně lze omezit první návštěvu na období do 40 dní ode dneška.

Úpravy série mění pouze návrh. **Hromadné ukládání celé série není součástí této verze**; jednotlivé návštěvy se připravují a potvrzují samostatně.

## Nastavení a zapamatování výběru

Společné nastavení otevřete tlačítkem **+**.

| Modul | Co přepínač ovládá |
| --- | --- |
| Objednání z karty klienta | Dlaždici **Najít termín** a tlačítka **Připravit návštěvu**. |
| Naplánovat sérii termínů | Ovládání pro návrhy více návštěv. |
| Zobrazit terapeuty | Pomocné ovládání sloupců původního kalendáře. |

Výběr terapeutů pro hledání je samostatný od výběru sloupců v kalendáři. V nastavení lze také trvale skrýt terapeuty z nabídky hledání.

### Co se ukládá

- Nastavení vzhledu, modulů a výchozích hodnot hledání.
- Poloha panelu.
- Trvale skrytí terapeuti.
- Vybraný terapeut nebo volba **Všichni** a zaškrtnutí jednotlivých terapeutů.
- Pomocný seznam ID a jmen terapeutů, nejvýše na 7 dní.

Možnosti pacienta se po obnovení stránky vymažou. Dostupnost termínů se při hledání načítá znovu; uložený seznam terapeutů není uložená obsazenost.

**Export/import nastavení** přenáší společné nastavení a trvale skryté terapeuty. Neobsahuje celý aktuální výběr zaškrtávacích polí, pomocný seznam terapeutů ani údaje klienta. Import nahrazuje odpovídající místní nastavení.

## Řešení potíží

| Problém | Co zkontrolovat |
| --- | --- |
| Fyzion+ se nezobrazuje | Skript je zapnutý v Tampermonkey, spouští se na `app.fyzion.cz` a není aktivní starší kopie. Obnovte stránku. |
| Chybí dlaždice na kartě | Zapněte **Objednání z karty klienta**. Skript musí rozpoznat detail klienta a právě jedno tlačítko nové návštěvy. |
| Chybí terapeuti | Při prvním použití nebo po vypršení pomocného seznamu otevřete kalendář. Zkontrolujte trvale skryté terapeuty v nastavení. |
| Nelze hledat z karty klienta | Počkejte na načtení přihlášeného Fyzionu. Pokud přístup k datům není zachycený, otevřete kalendář a vraťte se. |
| Příprava trvá několik sekund | Vyčkejte na dokončení. Skript čeká na načítání formuláře a ověřuje, zda služba nepřepsala čas. |
| Služba se nevybere | Zkontrolujte název i délku v nabídce. Při upozornění vyberte službu ručně a ověřte čas i délku. |
| Čas se přepsal | Vyčkejte na konečné potvrzení nebo chybu. Po ruční změně služby znovu zkontrolujte čas. |
| Výsledky zestárly | Spusťte hledání znovu a před uložením ověřte aktuální stav. |

Při hlášení chyby uveďte verzi Fyzion+, kroky k zopakování a přesnou hlášku. Snímky a HTML anonymizujte; neposílejte přihlašovací údaje ani data pacientů.

## Data a omezení

- Skript běží na `https://app.fyzion.cz/*` a používá přihlášené požadavky na `https://api.fyzion.cz`.
- Vlastní čtení dostupnosti používá GET požadavky na seznam terapeutů a kalendářní události. Uložení návštěvy provádíte ve formuláři Fyzionu.
- Přihlašovací hlavičky se drží pouze v paměti běžící stránky; skript je neukládá do místního nastavení.
- Místní nastavení je v úložišti prohlížeče pro danou stránku. Vymazání dat webu může nastavení odstranit.
- Kontrolní náhled zobrazuje obsazenost vybraného terapeuta bez jmen pacientů. **Neověřuje kolize klienta u jiných terapeutů ani dostupnost místnosti.**
- Návrh nenahrazuje kontrolu oprávnění, služby, místnosti a aktuální dostupnosti ve Fyzionu.
- Změny rozhraní nebo API Fyzionu mohou vyžadovat aktualizaci skriptu. Jednotlivé části jsou ověřované kontrolami kódu a simulacemi; nejde o záruku bezchybnosti při všech provozních situacích.
- Tato verze neobsahuje vzdálený tisk ani samostatnou instalaci rozšíření prohlížeče. Instaluje se jako uživatelský skript.

## Změny do verze 1.7.30

- Objednávání z karty klienta přes kompaktní dlaždici **Najít termín** nad původním tlačítkem nové návštěvy.
- Otevření a předvyplnění návštěvy jedním spuštěním přípravy, bez automatického uložení.
- Automatický výběr služby a rozlišení stejnojmenných terapií podle délky v nabídce.
- Čekání na načtení formuláře, opakování při překreslení a oprava opožděného přepisu času.
- Ukládání výběru terapeutů a pomocného seznamu pro obnovení na kartě klienta.
- Přepínač modulu objednání z karty klienta.
- Přehlednější výsledky s oddělenými daty, časy a tlačítky.
- Sjednocené zobrazení verze v panelu a exportu nastavení.
