import axios from "axios";
import { variables } from "@/constants";

const instance = axios.create({
  baseURL: variables.SERVER,
  headers: {
    "Content-Type": "application/json",
  },
});

export default instance;
