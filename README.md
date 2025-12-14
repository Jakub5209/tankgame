# 💥 Tank Duels: *Friday Edition* 🛡️

**Lokalna, dwuosobowa arena bitew czołgów.** Zanurz się w intensywnych, pikselowych pojedynkach 1 vs 1 na jednej klawiaturze. Szybka rozgrywka, dynamiczne power-upy i system customizacji czołgów czekają! Zbudowane na potężnym frameworku **Phaser 3**.

---

### ⭐ Najważniejsze Funkcje Gry

#### 🚀 **Dynamiczny Rozruch i Areny**
* **Spektakularne Otwarcie:** Po naciśnięciu "Rozpocznij Walkę" doświadczysz widowiskowej sekwencji: płynny fade-out menu, animowane zamykanie starej mapy i **imponująca animacja budowania nowej areny** w stylu "fali" (ściana po ścianie, od lewej do prawej), zakończona odliczaniem startowym.
* **Wiele Map:** Walcz w Bazie Wojskowej, neonowym Mieście lub na Otwartej Arenie.
* **Dynamiczny Podgląd Map:** Zobacz na żywo, jak będzie wyglądać wybrana mapa w menu głównym.

#### 🛠️ **Ulepszenia i Mechanika**
* **Wall Breaker na Strzały:** Power-up niszczący ściany został zmieniony na **limit 3 potężnych strzałów**, dając graczowi pełną kontrolę nad niszczycielską mocą.
* **Ulepszone Efekty Wizualne:** Strzały bez rykoszetu po uderzeniu w ścianę generują teraz realistyczną **animację iskrzenia i dźwięk**, zanim znikną.
* **Ulepszenia Czołgów (Coming Soon):** Zbieraj monety na polu bitwy, aby odblokowywać przyszłe ulepszenia czołgów (postęp zapisywany w Local Storage).
* **Rykoszety (Opcjonalnie):** Włącz lub wyłącz odbijanie pocisków od ścian w menu.

#### 🔋 **Arsenał Power-Upów**
Zdominuj arenę, zbierając potężne wzmocnienia:
* 🛡️ **Shield:** Tarcza ochronna na jedną kolizję.
* 💥 **Double Ammo:** Podwójna siła ognia na krótki czas.
* 🎯 **Missile:** Samonaprowadzająca się rakieta, która nie chybia celu.
* ☄️ **Breaker:** 3 strzały polzwalajace zniszczyć każdą ścianę.

---

### 🕹️ Sterowanie (Lokalny Multiplayer 1 vs 1)

Gra jest zoptymalizowana do intensywnej rywalizacji dla dwóch graczy na jednej klawiaturze.

| Gracz | Ruch (Przód/Tył) | Obrót (Lewo/Prawo) | Strzał (Kanon) |
| :---: | :---------------: | :----------------: | :------------: |
| **Czerwony** | **W / S** | **A / D** | **SPACE** |
| **Niebieski** | **⬆️ / ⬇️** | **⬅️ / ➡️** | **LEWY KLIK MYSZĄ** |

---

### ⚙️ Struktura Projektu

Projekt wykorzystuje JavaScript i **Phaser 3**, opierając się na dynamicznie generowanej grafice, co ułatwia modyfikacje wizualne.

| Plik | Rola w Projekcie |
| :--- | :--- |
| `index.html` | Główna struktura strony, definicja kontenera gry oraz nakładek UI (Menu, Game Over, Credits). |
| `style.css` | Pełna stylizacja interfejsu (menu, przyciski, nakładki) i **kluczowe animacje fade-out menu/loadingu**. |
| `game.js` | **Serce Gry.** Obsługa czołgów, sterowania, kolizji, Power-Upów, audio oraz kluczowe funkcje animowanego startu (`buildMapWithAnimation`, `startGame`). |
| `maps.js` | Definicja wszystkich układów map (`mapLayouts`) w postaci macierzy (tablic 20x15). |
| `ui.js` | Obsługa interakcji UI (przełączanie menu, zapis/odczyt ustawień, **logika nowego Loading Screen i Dowalonych Creditsów**). |

---

### 🛠️ Jak uruchomić projekt

Ponieważ gra ładuje lokalne zasoby (obrazy, dźwięki) za pomocą Phaser 3, **wymaga serwera lokalnego** do poprawnego działania.

1.  **Klonowanie Repozytorium:**
    ```bash
    git clone https://github.com/Jakub5209/tankgame
    ```
2.  **Uruchomienie Serwera Lokalnego (Rekomendowane):**
    * **VS Code:** Użyj rozszerzenia **"Live Server"**.
    * Kliknij prawym przyciskiem myszy na `index.html` i wybierz **"Open with Live Server"**.
3.  **Gotowe!** Wybierz opcje w menu głównym i rozpocznij dynamiczną walkę!
