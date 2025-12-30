import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';
import { FieldPlanner } from '@/components/planner/FieldPlanner';

const Planner = () => {
  return (
    <>
      <Helmet>
        <title>FTC DECODE Strategy Planner | Field Planner</title>
        <meta
          name="description"
          content="Interactive FTC DECODE field planner for building strategies and robot paths."
        />
      </Helmet>
      <div className="relative">
        <div className="fixed top-4 left-4 z-40 flex flex-wrap gap-2">
          <NavLink to="/" className="tool-button text-xs font-mono">
            Home
          </NavLink>
          <NavLink to="/patch-notes" className="tool-button text-xs font-mono">
            Patch Notes
          </NavLink>
          <NavLink to="/about" className="tool-button text-xs font-mono">
            About
          </NavLink>
        </div>
        <FieldPlanner />
      </div>
    </>
  );
};

export default Planner;
