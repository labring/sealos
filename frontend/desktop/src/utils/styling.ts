export function getPlanBackgroundClass(planName: string, isPayg: boolean, inDebt: boolean): string {
  if (isPayg) return 'bg-plan-payg';
  if (inDebt) return 'bg-plan-debt';

  const normalizedPlanName = planName.toLowerCase();

  switch (normalizedPlanName) {
    case 'starter':
      return 'bg-plan-starter';
    case 'pro':
      return 'bg-plan-pro';
    case 'enterprise':
      return 'bg-plan-enterprise';
    case 'free':
    case 'hobby':
      return 'bg-plan-hobby';
    case 'hobby plus':
    case 'hobby-plus':
    case 'standard':
      return 'bg-plan-hobby-plus';
    case 'team':
      return 'bg-plan-team';
    case 'customized':
      return 'bg-plan-customized';
    default:
      return 'bg-plan-starter'; // Default fallback
  }
}
