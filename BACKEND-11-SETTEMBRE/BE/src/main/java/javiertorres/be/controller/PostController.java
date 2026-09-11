package javiertorres.be.controller;

import javiertorres.be.model.Indirizzo;
import javiertorres.be.model.Post;
import javiertorres.be.service.PostService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import tools.jackson.databind.ObjectMapper;
import java.util.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService service;
    private final ObjectMapper objectMapper;
    public PostController(PostService service, ObjectMapper objectMapper) {
        this.service = service;
        this.objectMapper = objectMapper;
    }
    @GetMapping({"", "/"})
    public ResponseEntity<List<Post>> getAll() { return ResponseEntity.ok(service.findAll()); }
    @PostMapping(value = {"", "/"}, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Post> createJson(@RequestBody Post post) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(post));
    }
    @PostMapping(value = "/multipart", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Post> createMultipart(
            @RequestParam(defaultValue = "") String didascalia,
            @RequestParam String indirizzo,
            @RequestParam(required = false) String testoEstrattoOcr,
            @RequestParam("files") List<MultipartFile> files) {
        Indirizzo parsedAddress;
        try {
            parsedAddress = objectMapper.readValue(indirizzo, Indirizzo.class);
        } catch (Exception exception) {
            throw new IllegalArgumentException("L'indirizzo deve essere un JSON valido", exception);
        }
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.createMultipart(didascalia, parsedAddress, testoEstrattoOcr, files));
    }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { service.delete(id); return ResponseEntity.noContent().build(); }
    @PatchMapping("/{id}/didascalia")
    public ResponseEntity<Post> updateDidascalia(@PathVariable UUID id, @RequestBody String didascalia) { return ResponseEntity.status(HttpStatus.CREATED).body(service.updateDidascalia(id, didascalia)); }
}
