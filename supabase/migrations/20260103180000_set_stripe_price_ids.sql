-- Fill Stripe price IDs for billing plans
-- Keys must match the planKey used by the institucional site: `${roleKey}_${days}d`

UPDATE public.billing_plans
SET stripe_price_id = CASE key
  WHEN 'company_15d' THEN 'price_1SlVRM2He2ej8NkeS0vYJ0vz'
  WHEN 'company_30d' THEN 'price_1SlVRM2He2ej8NkeIcdRcLfa'
  WHEN 'company_90d' THEN 'price_1SlVRM2He2ej8NkerUqUDDbc'
  WHEN 'company_180d' THEN 'price_1SlVRM2He2ej8NkerrQ2UjfM'
  WHEN 'driver_15d' THEN 'price_1SlVRM2He2ej8NkeLewLWjVu'
  WHEN 'driver_30d' THEN 'price_1SlVRM2He2ej8Nke4B7MUgMS'
  WHEN 'driver_90d' THEN 'price_1SlVRM2He2ej8NkeK91vS8kn'
  WHEN 'driver_180d' THEN 'price_1SlVRM2He2ej8NkeycVYvmew'
  ELSE stripe_price_id
END,
updated_at = now()
WHERE key IN (
  'company_15d','company_30d','company_90d','company_180d',
  'driver_15d','driver_30d','driver_90d','driver_180d'
);
