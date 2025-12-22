import { Helmet } from 'react-helmet-async';
import { FieldPlanner } from '@/components/planner/FieldPlanner';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>FTC DECODE Strategy Planner | 2025-26 Season</title>
        <meta
          name="description"
          content="Interactive top-down strategy planning tool for FTC DECODE Challenge 2025-26. Plan robot paths, ball placements, and scoring strategies."
        />
      </Helmet>
      <FieldPlanner />
    </>
  );
};

export default Index;
