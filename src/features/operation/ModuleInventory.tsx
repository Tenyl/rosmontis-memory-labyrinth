import { resolveImageAsset } from '../../assets/assetRegistry';
import { getModule } from '../../game/modules';
import type { ModuleId } from '../../game/types';

interface ModuleInventoryProps {
  modules: ModuleId[];
}

export function ModuleInventory({ modules }: ModuleInventoryProps) {
  return (
    <section className="module-inventory" aria-labelledby="module-inventory-title">
      <header>
        <div>
          <span>COGNITIVE MODULES / {String(modules.length).padStart(2, '0')}</span>
          <h2 id="module-inventory-title">已装载模块</h2>
        </div>
      </header>

      {modules.length === 0 ? (
        <p className="module-inventory-empty">尚未装载认知模块</p>
      ) : (
        <ul className="module-inventory-list">
          {modules.map((moduleId) => {
            const module = getModule(moduleId);
            return (
              <li key={module.id}>
                <img src={resolveImageAsset('moduleCard')} alt="认知模块资源占位图" />
                <div>
                  <span>{module.rarity === 'rare' ? '稀有模块' : '标准模块'}</span>
                  <strong>{module.name}</strong>
                  <p>{module.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
