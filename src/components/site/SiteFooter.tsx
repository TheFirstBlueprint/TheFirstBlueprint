const SiteFooter = () => {
  return (
    <footer
      className="mt-auto py-4 bg-transparent text-center text-xs text-muted-foreground opacity-60"
      style={{
        fontSize: 'calc(0.65rem * var(--planner-zoom, 1))',
        width: 'calc(var(--planner-field-width, 100%) + 24px)',
        marginLeft: 'calc(var(--planner-field-left, 0px) - 12px)',
        marginRight: 'auto',
      }}
    >
      © 2026 Thefirstblueprint. All rights reserved. Unauthorized distribution, transmission or republication strictly prohibited.
    </footer>
  );
};

export default SiteFooter;
