import { useEffect, useState } from 'react'
import './App.css'
import Lab1Page from './pages/lab1/Lab1Page'
import Lab2Page from './pages/lab2/Lab2Page'
import Lab3Page from './pages/lab3/Lab3Page'
import Lab4Page from './pages/lab4/Lab4Page'

const LAB1_HASH = '#lab-1'
const LAB2_HASH = '#lab-2'
const LAB3_HASH = '#lab-3'
const LAB4_HASH = '#lab-4'

const getCurrentPage = () => {
  if (window.location.hash === LAB1_HASH) {
    return 'lab1'
  }

  if (window.location.hash === LAB2_HASH) {
    return 'lab2'
  }

  if (window.location.hash === LAB3_HASH) {
    return 'lab3'
  }

  if (window.location.hash === LAB4_HASH) {
    return 'lab4'
  }

  return 'home'
}

function App() {
  const [currentPage, setCurrentPage] = useState(getCurrentPage)

  useEffect(() => {
    const handleHashChange = () => {
      setCurrentPage(getCurrentPage())
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  const openLab1Page = () => {
    window.location.hash = LAB1_HASH
  }

  const openLab2Page = () => {
    window.location.hash = LAB2_HASH
  }

  const openLab3Page = () => {
    window.location.hash = LAB3_HASH
  }

  const openLab4Page = () => {
    window.location.hash = LAB4_HASH
  }

  const openMainMenu = () => {
    window.location.hash = ''
    setCurrentPage('home')
  }

  if (currentPage === 'lab1') {
    return <Lab1Page onBack={openMainMenu} />
  }

  if (currentPage === 'lab2') {
    return <Lab2Page onBack={openMainMenu} />
  }

  if (currentPage === 'lab3') {
    return <Lab3Page onBack={openMainMenu} />
  }

  if (currentPage === 'lab4') {
    return <Lab4Page onBack={openMainMenu} />
  }

  return (
    <main className="page">
      <section className="panel">
        <h1>Планирование эксперимента</h1>
        <div className="labs-grid">
          <button className="lab-button" type="button" onClick={openLab1Page}>
            Лабораторная работа №1
          </button>
          <button className="lab-button" type="button" onClick={openLab2Page}>
            Лабораторная работа №2
          </button>
          <button className="lab-button" type="button" onClick={openLab3Page}>
            Лабораторная работа №3
          </button>
          <button className="lab-button" type="button" onClick={openLab4Page}>
            Лабораторная работа №4
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
