/** Las pruebas que dependen de la configuración la importan primero. */
import { EXAMPLE_COMPETITORS, EXAMPLE_WORKSPACE } from "./example";
import { setWorkspace } from "./store";

setWorkspace(EXAMPLE_WORKSPACE, EXAMPLE_COMPETITORS);
