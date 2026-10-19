# Fyzion+ 1.1.0

Jeden skript pro Tampermonkey sdružuje úpravy vzhledu i hledání volných termínů. Samostatná aplikace ani Stylus pro tyto úpravy nejsou potřeba.

## První instalace nebo aktualizace

1. Ponechte si zálohu původního skriptu a export Stylusu.
2. V Tampermonkey otevřete existující pomocník Fyzionu, nahraďte celý obsah souborem `fyzion-helper.user.js` z tohoto balíčku a uložte. Nespouštějte dvě kopie pomocníka současně.
3. Ve Stylusu vypněte původní styly pro Fyzion (včetně společného stylu instalovaného z GitHubu). Nemažte je, dokud novou verzi neověříte. Jinak mohou zůstat jejich pravidla aktivní i při vypnutém přepínači ve Fyzion+.
4. Obnovte Fyzion. Přesouvatelné tlačítko se nyní jmenuje **Volné Termíny**.
5. Otevřete **Nastavení Fyzion+**. V části Vzhled můžete zapínat jednotlivé úpravy a měnit barvy. Další části obsahují výchozí hledání, přenos nastavení a seznam terapeutů.

Vzhled zůstává omezený na stejné části Fyzionu jako v dodaném exportu Stylusu. Časové popisky podporují celodenní osu s 96 řádky po 15 minutách. Nepravidelná pracovní doba není podporovaná.

## Co je součástí

- Kontrastnější volno a volitelná barva.
- Skrytí náhledu události při najetí myší.
- Časové popisky s pevnou šířkou textu.
- Skrytí nabídky Stav návštěvy na kartě pacienta.
- Odlišení šrafovaných událostí a volitelná barva.
- Hledání volných termínů u jednoho nebo všech povolených terapeutů; výchozí rozsah 40 dní a délka 30 minut, nastavitelné v menu.
- Kliknutí na termín s přechodem do kalendáře a zapnutím jeho terapeuta.
- Přesouvání panelu, zapamatování polohy a zachování výsledků při procházení kalendáře.
- Zachování již uloženého seznamu skrytých terapeutů v tomto prohlížeči.

## Přenos na jiný počítač

1. Na zdrojovém počítači otevřete Nastavení Fyzion+ → Přenos na jiný počítač → Export nastavení.
2. Na novém počítači nainstalujte Tampermonkey a tento skript. Pokud používáte Stylus, vypněte v něm stejné úpravy Fyzionu.
3. Ve Fyzion+ zvolte Import nastavení a vyberte exportovaný JSON. Import nahrazuje nastavení cílového počítače.

Export obsahuje barvy, přepínače, výchozí délku a rozsah hledání, polohu panelu a ID skrytých terapeutů. Neobsahuje pacienty, termíny, přihlašovací údaje ani oprávnění. Soubor nastavení přenášejte přímo mezi počítači; pro distribuci programu jej na veřejný GitHub nahrávat nemusíte.

## Aktualizace přes GitHub

1. Po vyzkoušení nové verze nahrajte `fyzion-helper.user.js` do hlavní složky větve `main` repozitáře `bruhaedwin/Fyzion_upravy`. Nahraďte existující stejnojmenný soubor.
2. Recepční počítače s již nastavenými aktualizacemi mohou dostat Fyzion+ jako aktualizaci skriptu. Vypnutí starých stylů ve Stylusu je nutné jednorázově provést na každém počítači.
3. Instalační a aktualizační adresa zůstává:

   https://raw.githubusercontent.com/bruhaedwin/Fyzion_upravy/main/fyzion-helper.user.js

4. Nový společný skript má verzi 1.1.0. Zachovává původní identitu skriptu, proto se v seznamu Tampermonkey může nadále zobrazovat pod jménem Fyzion – pomocník pro volné termíny.
5. Při dalších vydáních zvyšte číslo verze. Místní nastavení se běžnou aktualizací nepřepisuje.

Soubor `fyzion-style.user.css` může na GitHubu zůstat jako záloha pro starší instalace. Fyzion+ ho nestahuje a nepoužívá.

## Používání výsledků

Program pouze pomáhá hledat, nic sám nerezervuje. Zobrazené výsledky jsou snímkem načtené dostupnosti. Po změně kalendáře nebo po dvou minutách je označí k novému ověření; před rezervací spusťte hledání znovu. Případnou souběžnou rezervaci musí řešit Fyzion při ukládání.

## Návrat k původnímu řešení

Vraťte v Tampermonkey záložní verzi skriptu a znovu zapněte původní styly ve Stylusu. Pokud je již nová verze na GitHubu, počítejte s nastavenými automatickými aktualizacemi. Pro řízený návrat je vhodné vydat starý funkční kód s vyšším číslem verze.

Program prošel automatizovanými testy výpočtů, nastavení a simulovaného ovládání. Nové společné menu je potřeba ověřit také v živém Fyzionu, nejprve na testovacím počítači.
