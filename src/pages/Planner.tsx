import { Helmet } from 'react-helmet-async';
import { NavLink } from 'react-router-dom';
import { FieldPlanner } from '@/components/planner/FieldPlanner';
import { SiteHeader } from '@/components/site/SiteHeader';

const Planner = () => {
  return (
    <>
      <Helmet>
        <title>Thefirstblueprint | Field Planner</title>
        <meta
          name="description"
          content="Interactive FTC DECODE field planner for building strategies and robot paths."
        />
      </Helmet>
      <div className="h-screen bg-background flex flex-col overflow-hidden">
        <SiteHeader />
        <div className="flex-1 min-h-0">
          <FieldPlanner className="h-full" />
        </div>
      </div>
    </>
  );
};

export default Planner;
