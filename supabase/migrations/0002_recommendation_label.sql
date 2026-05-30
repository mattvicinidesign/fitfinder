-- Persist canonical recommendation label from the V1 scoring engine.

alter table public.analyses
  add column if not exists recommendation_label text;

update public.analyses
set recommendation_label = case recommendation
  when 'strong_apply' then 'Strong Pursuit'
  when 'apply' then 'Good Opportunity'
  when 'stretch' then 'Proceed With Caution'
  when 'not_recommended' then 'Low Alignment'
  else recommendation_label
end
where recommendation_label is null and recommendation is not null;
