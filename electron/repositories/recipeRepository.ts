import { eq, and } from 'drizzle-orm';
import { getDb } from '../db/index';
import * as schema from '../db/schema';

export const recipeRepository = {
  async getRecipesByServiceId(serviceId: number) {
    const db = getDb();
    return db
      .select({
        id: schema.serviceRecipes.id,
        hizmet_id: schema.serviceRecipes.hizmet_id,
        urun_id: schema.serviceRecipes.urun_id,
        miktar: schema.serviceRecipes.miktar,
        productName: schema.products.ad,
        productUnit: schema.products.birim,
      })
      .from(schema.serviceRecipes)
      .innerJoin(schema.products, eq(schema.serviceRecipes.urun_id, schema.products.id))
      .where(eq(schema.serviceRecipes.hizmet_id, serviceId));
  },

  async setRecipe(serviceId: number, productId: number, miktar: number) {
    const db = getDb();
    const existing = await db
      .select()
      .from(schema.serviceRecipes)
      .where(and(
        eq(schema.serviceRecipes.hizmet_id, serviceId),
        eq(schema.serviceRecipes.urun_id, productId)
      ));

    if (existing.length > 0) {
      await db.update(schema.serviceRecipes)
        .set({ miktar })
        .where(eq(schema.serviceRecipes.id, existing[0].id));
    } else {
      await db.insert(schema.serviceRecipes).values({
        hizmet_id: serviceId,
        urun_id: productId,
        miktar,
      });
    }
  },

  async removeRecipe(serviceId: number, productId: number) {
    const db = getDb();
    await db.delete(schema.serviceRecipes)
      .where(and(
        eq(schema.serviceRecipes.hizmet_id, serviceId),
        eq(schema.serviceRecipes.urun_id, productId)
      ));
  },
};
