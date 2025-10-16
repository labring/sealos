export const Polygon = ({ className, fillColor }: { className?: string; fillColor?: string }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="6" viewBox="0 0 12 6" fill="none">
      <path
        d="M6.74846 5.74205C6.31884 6.08598 5.68116 6.08598 5.25154 5.74205L0.397125 1.85579C-0.403072 1.21519 0.0870277 -8.5547e-08 1.14559 0L10.8544 7.84613e-07C11.913 8.7016e-07 12.4031 1.21519 11.6029 1.85579L6.74846 5.74205Z"
        fill={fillColor}
        className={className}
      />
    </svg>
  );
};
