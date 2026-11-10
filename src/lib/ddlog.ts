import fs from 'node:fs';
import path from 'node:path';

/**
 * Équivalent du keyword Robot `Generate DD Log` : une ligne JSON ajoutée à
 * <DD_LOG_DIR>/<robot>-<AAAAMMJJ>.log (collectée ensuite par Datadog).
 */
const pad = (n: number) => String(n).padStart(2, '0');

export function generateDDLog(o: {
  statut: string;
  message: string;
  robot: string;
  application: string; // présent dans la signature du Robot, non écrit dans le JSON
  client: string;
  logFile?: string; // chemin du rapport (équivalent de ${LOG FILE})
}) {
  const d = new Date();
  const time = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  const jour = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;

  const report = (o.logFile ?? '')
    .replace('\\\\wdkrpap01\\shared_files\\results\\', 'http://wdkrpap01.prod.dalkia.org/reports/')
    .replace(/\\/g, '/');

  // Même clés, même ordre et même espacement que le Robot ; JSON.stringify échappe les guillemets du message
  const q = JSON.stringify;
  const log =
    `{"robot": ${q(o.robot)},"service":"rpa","client":${q(o.client)},"message": ${q(o.message)},` +
    `"status": ${q(o.statut)},"date_execution": ${q(time)},"report": ${q(report)}}`;

  const dir = process.env.DD_LOG_DIR || 'C:/logs';
  try {
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, `${o.robot}-${jour}.log`), `${log}\n`);
  } catch (e) {
    // Un problème de log ne doit pas faire échouer le parcours
    console.warn(`Log Datadog non écrit: ${(e as Error).message}`);
  }
}
