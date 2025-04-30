import TourDemoContent from "./components/demo"
import { TourProvider } from "./providers/tour-provider"


function App() {
 

  return (
    <TourProvider>
      <TourDemoContent />
    </TourProvider>
  )
}

export default App