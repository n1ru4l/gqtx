import { createTypesFactory, buildGraphQLSchema } from '../dist';

const t = createTypesFactory<{ contextContent: string }>();

const enum Episode {
  NEWHOPE = 4,
  EMPIRE = 5,
  JEDI = 6,
}

type ICharacter = {
  type: 'Human' | 'Droid';
  id: string;
  name: string;
  friends: Array<string>;
  appearsIn: Array<Episode>;
};

type Human = {
  type: 'Human';
  id: string;
  name: string;
  friends: Array<string>;
  appearsIn: Array<Episode>;
  homePlanet: string | null;
};

type Droid = {
  type: 'Droid';
  id: string;
  name: string;
  friends: Array<string>;
  appearsIn: Array<Episode>;
  primaryFunction: string;
};

const luke: Human = {
  type: 'Human',
  id: '1000',
  name: 'Luke Skywalker',
  friends: ['1002', '1003', '2000', '2001'],
  appearsIn: [4, 5, 6],
  homePlanet: 'Tatooine',
};

const vader: Human = {
  type: 'Human',
  id: '1001',
  name: 'Darth Vader',
  friends: ['1004'],
  appearsIn: [4, 5, 6],
  homePlanet: 'Tatooine',
};

const han: Human = {
  type: 'Human',
  id: '1002',
  name: 'Han Solo',
  friends: ['1000', '1003', '2001'],
  appearsIn: [4, 5, 6],
  homePlanet: null,
};

const leia: Human = {
  type: 'Human',
  id: '1003',
  name: 'Leia Organa',
  friends: ['1000', '1002', '2000', '2001'],
  appearsIn: [4, 5, 6],
  homePlanet: 'Alderaan',
  // __typename: 'Human',
};

const tarkin: Human = {
  type: 'Human',
  id: '1004',
  name: 'Wilhuff Tarkin',
  friends: ['1001'],
  appearsIn: [4],
  homePlanet: null,
};

const humanData: Record<string, Human> = {
  '1000': luke,
  '1001': vader,
  '1002': han,
  '1003': leia,
  '1004': tarkin,
};

const threepio: Droid = {
  type: 'Droid',
  id: '2000',
  name: 'C-3PO',
  friends: ['1000', '1002', '1003', '2001'],
  appearsIn: [4, 5, 6],
  primaryFunction: 'Protocol',
};

const artoo: Droid = {
  type: 'Droid',
  id: '2001',
  name: 'R2-D2',
  friends: ['1000', '1002', '1003'],
  appearsIn: [4, 5, 6],
  primaryFunction: 'Astromech',
};

const droidData: Record<string, Droid> = {
  '2000': threepio,
  '2001': artoo,
};
function getCharacter(id: string) {
  return Promise.resolve(humanData[id] || droidData[id]);
}

export function getFriends(character: ICharacter): Array<Promise<ICharacter>> {
  return character.friends.map((id) => getCharacter(id));
}

export function getHero(episode: Episode | null): ICharacter {
  if (episode === 5) {
    // Luke is the hero of Episode V.
    return luke;
  }
  // Artoo is the hero otherwise.
  return artoo;
}

export function getHuman(id: string): Human {
  return humanData[id];
}

export function getDroid(id: string): Droid {
  return droidData[id];
}

const episodeEnum = t.enumType({
  name: 'Episode',
  description: 'One of the films in the Star Wars Trilogy',
  values: [
    { name: 'NEWHOPE', value: Episode.NEWHOPE },
    { name: 'EMPIRE', value: Episode.EMPIRE },
    { name: 'JEDI', value: Episode.JEDI },
  ],
});

const characterInterface = t.interfaceType<ICharacter>({
  name: 'Character',
  fields: (self) => [
    t.abstractField('id', t.NonNull(t.IDString)),
    t.abstractField('name', t.NonNull(t.String)),
    t.abstractField('appearsIn', t.NonNull(t.List(t.NonNull(episodeEnum)))),
    t.abstractField('friends', t.NonNull(t.List(self))),
  ],
});

const humanType = t.objectType<Human>({
  name: 'Human',
  description: 'A humanoid creature in the Star Wars universe.',
  interfaces: [characterInterface],
  isTypeOf: (thing: ICharacter) => thing.type === 'Human',
  fields: () => [
    t.defaultField('id', t.NonNull(t.ID)),
    t.defaultField('name', t.NonNull(t.String)),
    t.defaultField('appearsIn', t.NonNull(t.List(t.NonNull(episodeEnum)))),
    t.defaultField('homePlanet', t.String),
    t.field('friends', {
      type: t.NonNull(t.List(characterInterface)),
      resolve: (c) => {
        return Promise.all(getFriends(c));
      },
    }),
    t.field('secretBackStory', {
      type: t.String,
      resolve: () => {
        throw new Error('secretBackstory is secret');
      },
    }),
  ],
});

const droidType = t.objectType<Droid>({
  name: 'Droid',
  description: 'A mechanical creature in the Star Wars universe.',
  interfaces: [characterInterface],
  isTypeOf: (thing: ICharacter) => thing.type === 'Droid',
  fields: () => [
    t.defaultField('id', t.NonNull(t.IDString)),
    t.defaultField('name', t.NonNull(t.String)),
    t.defaultField('appearsIn', t.NonNull(t.List(t.NonNull(episodeEnum)))),
    t.defaultField('primaryFunction', t.NonNull(t.String)),
    t.field('friends', {
      type: t.NonNull(t.List(characterInterface)),
      resolve: (c) => {
        return Promise.all(getFriends(c));
      },
    }),
    t.field('secretBackStory', {
      type: t.String,
      resolve: () => {
        throw new Error('secretBackstory is secret');
      },
    }),
  ],
});

const queryType = t.queryType({
  fields: [
    t.field('hero', {
      type: characterInterface,
      args: {
        episode: t.defaultArg(episodeEnum, Episode.EMPIRE),
      },
      resolve: (_, { episode }) => getHero(episode),
    }),
    t.field('human', {
      type: humanType,
      args: { id: t.arg(t.NonNullInput(t.ID)) },
      resolve: (_, { id }) => getHuman(id),
    }),
    t.field('droid', {
      type: droidType,
      args: {
        id: t.arg(t.NonNullInput(t.String), 'ID of the droid'),
      },
      resolve: (_, { id }) => getDroid(id),
    }),
    t.field('contextContent', {
      type: t.String,
      resolve: (_, _args, ctx) => ctx.contextContent,
    }),
  ],
});

const schema = {
  query: queryType,
};

import express from 'express';
import graphqlHTTP from 'express-graphql';

const app = express();

app.use(
  '/graphql',
  graphqlHTTP({
    schema: buildGraphQLSchema(schema),
    graphiql: true,
  })
);

app.listen(4000);
