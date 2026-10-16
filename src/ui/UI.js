import Loader from './Loader.js'
import Tooltip from './Tooltip.js'
import CountryPanel from './CountryPanel.js'
import CountryList from './CountryList.js'
import Clock from './Clock.js'
import Credits from './Credits.js'

/** Agrupa los componentes de interfaz HTML que flotan sobre el canvas. */
export default class UI {
  constructor(experience) {
    this.experience = experience
    this.loader = new Loader()
    this.tooltip = new Tooltip()
    this.clock = new Clock()
    this.credits = new Credits()
    this.panel = new CountryPanel(() => experience.reset())
    this.list = new CountryList(
      (iso) => experience.visit(iso),
      (iso) => experience.world.countries?.setHovered(iso)
    )

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') experience.reset()
    })
  }

  onCountriesReady(countries) {
    this.list.render(countries)
  }
}
