import React from 'react';
import { Switch, Route, Link } from 'react-router-dom';
import Home from './components/Home';
import About from './components/About';

const App: React.FC = () => {
  return (
    <div>
      <nav>
        <ul>
          <li>
            <Link to='/'>Home</Link>
          </li>
          <li>
            <Link to='/about'>About</Link>
          </li>
        </ul>
      </nav>

      <Switch>
        <Route exact path='/' component={Home} />
        <Route path='/about' component={About} />
      </Switch>
    </div>
  );
};

export default App;
