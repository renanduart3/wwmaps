# Verificação técnica do observatório

A consulta `npm audit` em 20/10/2026 retornou três avisos no conjunto já utilizado pelo projeto: Astro (crítico), Sharp (alto) e esbuild (baixo). A correção sugerida exige atualizar Astro para uma versão principal nova (7.3.8) e Sharp para 0.35.5. Essa migração não faz parte da alteração de interface; deve ser feita e validada antes da publicação. O ambiente atual também usa Node 22.18, abaixo do mínimo 22.19 declarado pelo projeto. Nenhum deploy foi realizado nesta alteração.
