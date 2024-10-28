import { ChakraProvider } from '@chakra-ui/react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import Template from './components/Template'
import Info from './components/Info'

const App = () => {
  return (
    <ChakraProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Template />} />
          <Route path="/info" element={<Info />} />
        </Routes>
      </Router>
    </ChakraProvider>
  )
}

export default App
