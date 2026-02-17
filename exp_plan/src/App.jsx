import { useEffect, useState } from 'react'
import './App.css'
import Lab1Page from './pages/lab1/Lab1Page'

const LAB1_HASH = '#lab-1'

const getCurrentPage = () => (window.location.hash === LAB1_HASH ? 'lab1' : 'home')

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

  const openMainMenu = () => {
    window.location.hash = ''
    setCurrentPage('home')
  }

  if (currentPage === 'lab1') {
    return <Lab1Page onBack={openMainMenu} />
  }

  return (
    <main className="page">
      <section className="panel">
        <h1>Планирование эксперимента</h1>
        <div className="labs-grid">
          <button className="lab-button" type="button" onClick={openLab1Page}>
            Лабораторная работа №1
          </button>
          <button className="lab-button" type="button" disabled>
            Лабораторная работа №2
          </button>
          <button className="lab-button" type="button" disabled>
            Лабораторная работа №3
          </button>
          <button className="lab-button" type="button" disabled>
            Лабораторная работа №4
          </button>
        </div>
      </section>
    </main>
  )
}

export default App
