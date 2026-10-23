import { initializeStorefront } from './storefront.js';

function initializeNavigation() {
  const menuButton = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('.nav-links');
  if (!menuButton || !navigation) return;

  menuButton.addEventListener('click', () => {
    const isOpen = navigation.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });

  navigation.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navigation.classList.remove('open');
      menuButton.setAttribute('aria-expanded', 'false');
    });
  });
}

function initializePage() {
  const year = document.querySelector('#year');
  if (year) year.textContent = new Date().getFullYear();
  initializeNavigation();
  initializeStorefront();
}

initializePage();
