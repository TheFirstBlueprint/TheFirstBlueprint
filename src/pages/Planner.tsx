import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';
import { FieldPlanner } from '@/components/planner/FieldPlanner';
import { SiteHeader } from '@/components/site/SiteHeader';

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
      <div className="min-h-screen bg-background flex flex-col">
        <SiteHeader />
        <div className="flex-1">
          <FieldPlanner className="h-full" />
        </div>
      </div>
    </>
  );
};

export default Planner;
