import pkg from 'msnodesqlv8';
const { sql } = pkg;

const connectionString = "server=.;Database=Rewards;Trusted_Connection=Yes;Driver={ODBC Driver 17 for SQL Server}";

sql.query(connectionString, `
  SELECT 
    fk.name AS ForeignKey,
    tp.name AS ParentTable,
    ref.name AS ReferenceTable,
    fk.update_referential_action_desc AS UpdateAction
  FROM sys.foreign_keys fk
  INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
  INNER JOIN sys.tables ref ON fk.referenced_object_id = ref.object_id
`, (err, rows) => {
  if (err) {
    console.error(err);
  } else {
    console.log(rows);
  }
});
