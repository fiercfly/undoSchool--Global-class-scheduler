import type { Knex } from "knex";
import db from "../database/connection";
import { Parent } from "./types";

export class ParentRepository {
  private getDb(trx?: Knex.Transaction) {
    return trx || db;
  }

  async findById(id: string, trx?: Knex.Transaction): Promise<Parent | null> {
    const query = this.getDb(trx)("parents").where({ id });

    // Acquire row-level write lock if in a transaction
    if (trx) {
      query.forUpdate();
    }

    const parent = await query.first();
    return parent || null;
  }
}
