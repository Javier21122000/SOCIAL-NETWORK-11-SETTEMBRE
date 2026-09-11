package javiertorres.be.controller;

import javiertorres.be.model.Post;
import javiertorres.be.service.PostService;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.util.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {
    private final PostService service;
    public PostController(PostService service) { this.service = service; }
    @GetMapping({"", "/"})
    public ResponseEntity<List<Post>> getAll() { return ResponseEntity.ok(service.findAll()); }
    @PostMapping({"", "/"})
    public ResponseEntity<Post> create(@RequestBody Post post) { return ResponseEntity.status(HttpStatus.CREATED).body(service.create(post)); }
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) { service.delete(id); return ResponseEntity.noContent().build(); }
    @PatchMapping("/{id}/didascalia")
    public ResponseEntity<Post> updateDidascalia(@PathVariable UUID id, @RequestBody String didascalia) { return ResponseEntity.status(HttpStatus.CREATED).body(service.updateDidascalia(id, didascalia)); }
}
