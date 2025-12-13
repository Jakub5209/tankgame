# 💥 Tank Duels *Friday Edition* 🛡️

Wciągająca, lokalna gra multiplayer 1 vs 1, inspirowana klasycznymi bitwami czołgów z elementami power-upów i dynamicznymi mapami, stworzona przy użyciu frameworka Phaser 3.

## 🌟 Cechy Gry

* **Lokalny Multiplayer (1 vs 1):** Czerwony kontra Niebieski w intensywnych pojedynkach na jednej klawiaturze.
* **Dynamiczny Podgląd Mapy:** Podgląd wybranej mapy w menu głównym **odświeża się automatycznie co sekundę** za pomocą mechanizmu `setInterval`, bez potrzeby odświeżania strony.
* **Dynamiczne Power-Upy:** Zbieraj tarcze ochronne (Shield), podwójną amunicję (Double Ammo) i potężne rakiety samonaprowadzające (Missile).
* **Rykoszety (Opcjonalnie):** Ustaw w menu, czy pociski mają odbijać się od ścian, wprowadzając chaos i nowe taktyki!
* **Wiele Map:** Walcz w Bazie Wojskowej, w neonowym Mieście lub na **Otwartej Arenie**.
* **System Monet:** Zbieraj monety na polu bitwy, aby odblokowywać przyszłe ulepszenia (zapisywane w Local Storage).
* **System Audio:** Pełne udźwiękowienie strzałów, eksplozji i muzyki tła, z suwakiem do kontroli głośności muzyki.
* **Odliczanie Startowe:** Dynamiczne odliczanie do rozpoczęcia rundy.

## 🎮 Sterowanie

Gra jest zaprojektowana dla dwóch graczy na jednej klawiaturze.

| Gracz | Ruch (Przód/Tył) | Obrót (Lewo/Prawo) | Strzał (Kanon) |
| :---: | :---------------: | :----------------: | :------------: |
| **Czerwony** | W / S | A / D | SPACE |
| **Niebieski** | ⬆️ / ⬇️ | ⬅️ / ➡️ | SHIFT |

## 🛠️ Struktura Projektu

Projekt opiera się na **Phaser 3** i jest zorganizowany w następujące pliki:

| Plik | Opis |
| :--- | :--- |
| `index.html` | Główny plik HTML, definiujący strukturę strony, kontener gry i interfejsy menu/Game Over. |
| `style.css` | Definicje wizualne dla menu, ekranów Game Over i kontenera gry. |
| `game.js` | **Główny silnik gry.** Zawiera logikę ładowania, tworzenia czołgów, sterowania, kolizji, mechaniki Power-Upów oraz obsługę audio. Zawiera również globalny mechanizm `setInterval` do dynamicznej zmiany mapy w menu. |
| `maps.js` | Definicja układów map (`mapLayouts`) w postaci macierzy (tablic 20x15). Umożliwia łatwe dodawanie nowych poziomów. |

## 🚀 Jak uruchomić projekt

Ponieważ projekt jest oparty na HTML5 i JavaScript (Phaser 3), wymaga serwera lokalnego (np. Live Server w VS Code) do poprawnego ładowania zasobów, szczególnie plików dźwiękowych.

1.  **Sklonuj Repozytorium:**
    ```bash
    git clone [https://github.com/Jakub5209/tankgame](https://github.com/Jakub5209/tankgame)
    ```
2.  **Uruchom Serwer Lokalny:**
    * Jeśli używasz **VS Code**, zainstaluj rozszerzenie "Live Server".
    * Kliknij prawym przyciskiem myszy na `index.html` i wybierz "Open with Live Server".
3.  **Graj!**
    * W menu głównym wybierz opcje (Mapę, Rykoszety, Głośność) i kliknij **ROZPOCZNIJ WALKĘ**.

## 🎨 Elementy Graficzne (Phaser Graphics)

Większość obiektów w grze (czołgi, pociski, ściany, power-upy) jest generowana dynamicznie za pomocą metody `scene.make.graphics()` i konwertowana na tekstury. Umożliwia to łatwe kolorowanie i modyfikację w locie.
