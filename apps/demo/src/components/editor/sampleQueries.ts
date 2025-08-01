// Sample SQL queries for different dialects
export const sampleQueries = {
  mysql: `-- User profile analysis with regional data
SELECT 
    up.user_id,
    up.first_name,
    up.last_name,
    SHA2(up.email, 256) as email_hash,
    up.city,
    up.state,
    YEAR(CURRENT_DATE) - YEAR(up.date_of_birth) as age
FROM user_profiles up
WHERE up.state IN ('CA', 'NY', 'TX')
ORDER BY age DESC;`,

  postgresql: `-- Product sales analysis with store information using CTEs
WITH filtered_sales AS (
    SELECT 
        product_id,
        store_id,
        quantity_sold,
        unit_price,
        discount_percentage
    FROM product_sales 
    WHERE sale_date >= '2023-01-01'
),
store_sales_summary AS (
    SELECT 
        fs.product_id,
        fs.store_id,
        SUM(fs.quantity_sold) as total_quantity,
        AVG(fs.unit_price) as avg_price,
        SUM(fs.quantity_sold * fs.unit_price * (1 - fs.discount_percentage/100)) as net_revenue
    FROM filtered_sales fs
    GROUP BY fs.product_id, fs.store_id
),
final_report AS (
    SELECT 
        sss.product_id,
        s.store_name,
        s.region,
        sss.total_quantity,
        sss.avg_price,
        sss.net_revenue
    FROM store_sales_summary sss
    JOIN stores s ON sss.store_id = s.id
)
SELECT 
    product_id,
    store_name,
    region,
    total_quantity,
    avg_price,
    net_revenue
FROM final_report
ORDER BY net_revenue DESC;`,

  bigquery: `-- Regional sales performance
SELECT 
    s.region,
    COUNT(DISTINCT ps.product_id) as unique_products,
    SUM(ps.quantity_sold) as total_units_sold,
    AVG(ps.unit_price) as avg_unit_price,
    SUM(ps.quantity_sold * ps.unit_price) as gross_revenue
FROM \`product_sales\` ps
JOIN \`stores\` s ON ps.store_id = s.id
GROUP BY s.region
ORDER BY gross_revenue DESC;`,

  trino: `-- Store manager performance analysis
SELECT 
    s.manager_id,
    s.store_name,
    s.region,
    COUNT(ps.id) as total_sales,
    SUM(ps.quantity_sold * ps.unit_price) as total_revenue,
    AVG(ps.discount_percentage) as avg_discount_rate
FROM stores s
JOIN product_sales ps ON s.id = ps.store_id
GROUP BY s.manager_id, s.store_name, s.region
ORDER BY total_revenue DESC;`,

  sqlite: `-- Customer demographics by region
SELECT 
    up.state,
    COUNT(*) as customer_count,
    AVG(CAST((julianday('now') - julianday(up.date_of_birth)) / 365 AS INTEGER)) as avg_age,
    SUBSTR(up.first_name, 1, 1) || '***' as masked_name_sample
FROM user_profiles up
WHERE up.state IS NOT NULL
GROUP BY up.state
ORDER BY customer_count DESC;`,

  transactsql: `-- Comprehensive sales and customer analysis
SELECT 
    s.store_name,
    s.region,
    ps.product_id,
    SUM(ps.quantity_sold * ps.unit_price) as gross_revenue,
    SUM(ps.quantity_sold * ps.unit_price * ps.discount_percentage/100) as total_discounts,
    COUNT(DISTINCT ps.sale_date) as active_sales_days
FROM stores s
JOIN product_sales ps ON s.id = ps.store_id
GROUP BY s.store_name, s.region, ps.product_id
HAVING gross_revenue > 1000
ORDER BY gross_revenue DESC;`,
} as const;

export type SupportedDialect = keyof typeof sampleQueries;
