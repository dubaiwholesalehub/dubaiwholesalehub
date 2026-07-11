insert into public.subcategories
(category_id,name,slug)

select 
id,
'Kitchen Storage',
'kitchen-storage'
from public.categories
where slug='kitchen-appliances';


insert into public.subcategories
(category_id,name,slug)

select 
id,
'Mobile Accessories',
'mobile-accessories'
from public.categories
where slug='electronics-gadgets';


insert into public.subcategories
(category_id,name,slug)

select 
id,
'Power Tools',
'power-tools'
from public.categories
where slug='tools-hardware';


insert into public.subcategories
(category_id,name,slug)

select 
id,
'Personal Care',
'personal-care'
from public.categories
where slug='beauty-cosmetics';


insert into public.subcategories
(category_id,name,slug)

select 
id,
'Toys',
'toys'
from public.categories
where slug='toys-games';