import { Service, PricingRule } from '../types';

export function calculateDynamicPrice(service: Service, rules: PricingRule[], context: { occupancy?: number, isWeekend?: boolean, isHoliday?: boolean }) {
  let finalPrice = service.base_price;
  const activeRules = rules.filter(r => r.is_active);

  activeRules.forEach(rule => {
    let applies = false;

    if (rule.type === 'occupancy' && context.occupancy !== undefined) {
      // Assuming condition_value is the threshold (e.g., 80 for 80% occupancy)
      if (context.occupancy >= Number(rule.condition_value)) {
        applies = true;
      }
    } else if (rule.type === 'seasonal') {
      // Simple check for weekend/holiday for now
      if (rule.condition_value === 'weekend' && context.isWeekend) {
        applies = true;
      } else if (rule.condition_value === 'holiday' && context.isHoliday) {
        applies = true;
      }
    } else if (rule.type === 'event') {
      // Event logic could be more complex, but for now we assume it's a specific event name
      // and we'd need more context to match it.
    }

    if (applies) {
      if (rule.adjustment_type === 'percentage') {
        finalPrice += (service.base_price * (rule.adjustment_value / 100));
      } else {
        finalPrice += rule.adjustment_value;
      }
    }
  });

  return Math.round(finalPrice);
}
