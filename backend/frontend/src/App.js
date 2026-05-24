import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Upload from "./pages/Upload";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FindVets from "./pages/FindVets";
import FindCreche from "./pages/FindCreche";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upload" element={<Upload />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/find-vets" element={<FindVets />} />
        <Route path="/find-creche" element={<FindCreche />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
