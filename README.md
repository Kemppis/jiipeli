# jiipeli

-Run locally
Open a terminal in jiipeli

Start a simple local server:

If Python is installed:
py -m http.server 8000
or python -m http.server 8000
Open in browser:
http://localhost:8000

-Server
ssh vattu@192.168.1.132
cd /var/www/html
sudo git pull



identifiointi: laite ID, sähköposti, sähköposti linkki verifiointi

UI: etusivu, notifikaatiot, profiili
  etusivu
    pelit, sort, filter, uusi peli
  notifikaatiot kronologisessa järjestyksessä
  profiili
    hostaamat pelit
    osallistutut pelit
    pisteet/voitot
    synkkaa sähköposti
    palaute


GM pelit etusivulla: peli tyyppi, kuvaus, countdown, säännöt, äänestys

Peli tyypit: onko sulla tiputus ja pisteet, hangman, vapaa vastaus, yksi kierros

Peli: osallistuminen ennen countdown, seuraa, äänestys, tehtävä -> notifikaatio, kuvaus, aika, vastaukset

-peli countdown
-kierros:
  -tehtävä
  -vastaus
  -hyväksy/hylkää vastaus
  -uusi kierros
-voittaja


make progressive web app for simple discussion forum