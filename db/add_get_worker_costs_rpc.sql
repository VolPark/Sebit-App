-- Function to get total mapped costs for workers in a given month
CREATE OR REPLACE FUNCTION public.get_worker_costs_for_month(
  p_year INT,
  p_month INT,
  p_worker_ids BIGINT[] DEFAULT NULL
)
RETURNS TABLE (
  worker_id BIGINT,
  total_cost NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    am.pracovnik_id,
    COALESCE(SUM(am.amount), 0) as total_cost
  FROM
    public.accounting_mappings am
  JOIN
    public.accounting_documents ad ON am.document_id = ad.id
  WHERE
    am.pracovnik_id IS NOT NULL
    AND (p_worker_ids IS NULL OR am.pracovnik_id = ANY(p_worker_ids))
    -- Filter by issue_date (datum vystavení) matching the requested month/year
    AND EXTRACT(YEAR FROM ad.issue_date) = p_year
    AND EXTRACT(MONTH FROM ad.issue_date) = p_month
  GROUP BY
    am.pracovnik_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_worker_costs_for_month(INT, INT, BIGINT[]) TO authenticated;
