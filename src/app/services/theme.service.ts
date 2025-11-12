import { Injectable, effect, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private getInitialDarkModePreference(): boolean {
    const storedPreference = localStorage.getItem('darkMode');
    if (storedPreference) {
      return JSON.parse(storedPreference);
    }
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  }

  private readonly darkMode = signal<boolean>(this.getInitialDarkModePreference());

  isDarkMode = this.darkMode.asReadonly();

  constructor() {
    effect(() => {
      document.body.classList.toggle('dark', this.darkMode());
      localStorage.setItem('darkMode', JSON.stringify(this.darkMode()));
    });
  }

  toggleDarkMode() {
    this.darkMode.update(value => !value);
  }
}

