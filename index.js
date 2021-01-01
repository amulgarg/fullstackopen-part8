const { ApolloServer, gql, UserInputError, AuthenticationError } = require('apollo-server')
const { v1: uuid } = require('uuid');
require('dotenv').config();
const mongoose = require('mongoose');
const Book = require('./models/book');
const Author = require('./models/author');
const User = require('./models/user');
const jwt = require('jsonwebtoken');
const JWT_SECRET = "jwt_secret";

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false, useCreateIndex: true })
    .then(() => {
      console.log('connected to MongoDB')
    })
    .catch((error) => {
      console.log('error connection to MongoDB:', error.message)
    })


const typeDefs = gql`
  type Author {
    name: String!,
    born: Int,
    bookCount: Int!,
    id: ID!
  }
  type Book {
    title: String!,
    published: Int,
    author: Author,
    genres: [String!]!,
    id: ID!
  }
  type User {
    username: String!
    favoriteGenre: String!
    id: ID!
  }  
  type Token {
    value: String!
  }
  type Query {
    bookCount: Int!,
    authorCount: Int!,
    allBooks(author: String, genre: String): [Book!]!,
    allAuthors: [Author!]!,
    me: User
  }
  type Mutation {
    addBook(
      title: String!,
      author: String!,
      published: Int,
      genres: [String!]!
    ): Book,
    editAuthor(
      name: String!
      setBornTo: Int!
    ): Author
    createUser(
      username: String!
      favoriteGenre: String!
    ): User
    login(
      username: String!
      password: String!
    ): Token
  }
`

const resolvers = {
  Query: {
    bookCount: async () => {
      const books = await Book.find({});
      return books.length;
    },
    authorCount: async () => {
      const books = await Author.find({});
      return books.length;
    },
    allBooks: async (root, args) => {
      let booksList = await Book.find({}).populate('author');      
      /* if(args.author){
        booksList = books.filter(book => book.author === args.author)
      } */

      if(args.genre){
        booksList = booksList.filter(book => book.genres.includes(args.genre))
      }

      return booksList;
    },
    allAuthors: async () => {
      const authorsList = await Author.find({});
      return authorsList.map(async (author) => {
        const booksByAuthor = await Book.find({author: author});
        console.log('bookslen', booksByAuthor.length);
        return {
          id: author._id,
          name: author.name,
          bookCount: booksByAuthor.length,
          born: author.born
        }
      });
    },

    me: (root, args, context) => {
      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      return context.currentUser;
    }

  },
  Mutation: {
    addBook: async (root, args, context) => {

      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      let author = await Author.findOne({name: args.author});
      let authorResult = author;
      console.log('author', author);
      
      if(!author){
        try{
          author = new Author({name: args.author});
          authorResult = await author.save();
        }
        catch(error){
          throw new UserInputError(error.message, {
            invalidArgs: args,
          })
        }
      }

      console.log('authorResult', authorResult);

      try{
        const newBook = new Book({
          title: args.title,
          published: args.published,
          genres: args.genres,
          author: authorResult    
        });
        await newBook.save();
      } catch(error) {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }

      return newBook;    
    },

    editAuthor: async (root, args, context) => {

      if (!context.currentUser) {
        throw new AuthenticationError("not authenticated")
      }

      const authorToUpdate = await Author.findOne({ name: args.name });
      authorToUpdate.born = args.setBornTo;
      try {
        await authorToUpdate.save();     
      } catch(error){
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      }
      return authorToUpdate;
    },

    createUser: async (root, args) => {
      const user = new User({ username: args.username, favoriteGenre: args.favoriteGenre });
      user.save().catch(error => {
        throw new UserInputError(error.message, {
          invalidArgs: args,
        })
      });
      return user;
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })
  
      if ( !user || args.password !== 'secret' ) {
        throw new UserInputError("wrong credentials")
      }
  
      const userForToken = {
        username: user.username,
        id: user._id,
      }
  
      return { value: jwt.sign(userForToken, JWT_SECRET) }
    },
  }
}

const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: async ({ req }) => {
    const auth = req ? req.headers.authorization : null
    if (auth && auth.toLowerCase().startsWith('bearer ')) {
      const decodedToken = jwt.verify(
        auth.substring(7), JWT_SECRET
      )

      const currentUser = await User
        .findById(decodedToken.id)
        
      return { currentUser }
    }
  }
})

server.listen().then(({ url }) => {
  console.log(`Server ready at ${url}`)
})


/* query 


query {
  bookCount,
  authorCount,
  allAuthors {
    name,
    bookCount
  },
  allBooks(genre: "classic", author:"Fyodor Dostoevsky"){
    title,
    genres,
    author
  }
}

*/


/* mutation
mutation {
  addBook(
    title: "NoSQL Distilled",
    author: "Martin Fowler",
    published: 2012,
    genres: ["database", "nosql"]
  ) {
    title,
    author
  }
}

mutation {
  editAuthor(name: "Martin Fowler", setBornTo: 1958) {
    name
    born
  }
}

*/