import "reflect-metadata";
import "@server/storage/database";
import fs from "node:fs/promises";
import path from "node:path";
import { addHours } from "date-fns";
import { UserRole, CollectionPermission } from "@shared/types";
import { Team, User, Collection } from "@server/models";
import { sequelize } from "@server/storage/database";

async function seed() {
  if (
    new URL(process.env.DATABASE_URL || "").pathname !== "/outline_playwright"
  ) {
    throw new Error(
      "El seed de Playwright requiere la base outline_playwright."
    );
  }
  const [team] = await Team.findOrCreate({
    where: { name: "Outline Playwright QA" },
    defaults: {
      name: "Outline Playwright QA",
      subdomain: "playwright-qa",
      passkeysEnabled: false,
    },
  });
  const roles = {
    admin: UserRole.Admin,
    editor: UserRole.Member,
    editorB: UserRole.Member,
    viewer: UserRole.Viewer,
    guest: UserRole.Guest,
  };
  const actors: Record<string, { id: string; token: string }> = {};
  for (const [name, role] of Object.entries(roles)) {
    const [user] = await User.findOrCreate({
      where: {
        teamId: team.id,
        email: `${name.toLowerCase()}@playwright.example`,
      },
      defaults: {
        teamId: team.id,
        name: `QA ${name}`,
        email: `${name.toLowerCase()}@playwright.example`,
        role,
        language: "es_ES",
      },
    });
    await user.update({ role });
    actors[name] = {
      id: user.id,
      token: user.getSessionToken(addHours(new Date(), 2)),
    };
  }
  const [collection] = await Collection.findOrCreate({
    where: { teamId: team.id, name: "Playwright QA" },
    defaults: {
      teamId: team.id,
      name: "Playwright QA",
      createdById: actors.admin.id,
      permission: CollectionPermission.ReadWrite,
    },
  });
  await fs.writeFile(
    path.join(process.env.QA_ROOT || ".qa", "actors.json"),
    JSON.stringify({
      teamId: team.id,
      collectionId: collection.id,
      actors,
    }),
    { mode: 0o600 }
  );
  // oxlint-disable-next-line no-console
  console.log("Workspace QA y cinco roles preparados.");
}

void seed()
  .then(async () => {
    await sequelize.close();
    process.exit(0);
  })
  .catch((error: Error) => {
    // oxlint-disable-next-line no-console
    console.error(error.message);
    process.exit(1);
  });
