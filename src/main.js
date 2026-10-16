import './styles/main.css'
import Experience from './core/Experience.js'

const experience = new Experience(document.querySelector('canvas.webgl'))

// Útil para depurar desde la consola del navegador
window.experience = experience
